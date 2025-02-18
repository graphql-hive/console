/**
 * Use this to connect authentication providers that support OIDC.
 *
 * ```ts {5-8}
 * import { OidcProvider } from "@openauthjs/openauth/provider/oidc"
 *
 * export default issuer({
 *   providers: {
 *     oauth2: OidcProvider({
 *       clientId: "1234567890",
 *       issuer: "https://auth.myserver.com"
 *     })
 *   }
 * })
 * ```
 *
 *
 * @packageDocumentation
 */

import { createLocalJWKSet, JSONWebKeySet, jwtVerify } from 'jose';
import { z } from 'zod';
import { OauthError } from '../error.js';
import { getRelativeUrl } from '../util.js';
import { Provider } from './provider.js';

interface WellKnown {
  /**
   * The URI to the JWKS endpoint.
   */
  jwks_uri: string;
  /**
   * The URI to the token endpoint.
   */
  token_endpoint: string;
  /**
   * The URI to the authorization endpoint.
   */
  authorization_endpoint: string;
}

type JWTPayload = {
  [key: string]: unknown;
  exp?: number;
  nbf?: number;
  iat?: number;
};

export interface OidcConfig {
  /**
   * @internal
   */
  type?: string;
  /**
   * The client ID.
   *
   * This is just a string to identify your app.
   *
   * @example
   * ```ts
   * {
   *   clientID: "my-client"
   * }
   * ```
   */
  clientID: string;
  /**
   * The URL of your authorization server.
   *
   * @example
   * ```ts
   * {
   *   issuer: "https://auth.myserver.com"
   * }
   * ```
   */
  issuer: string;
  /**
   * A list of OIDC scopes that you want to request.
   *
   * @example
   * ```ts
   * {
   *   scopes: ["openid", "profile", "email"]
   * }
   * ```
   */
  scopes?: string[];
  /**
   * Any additional parameters that you want to pass to the authorization endpoint.
   * @example
   * ```ts
   * {
   *   query: {
   *     prompt: "consent"
   *   }
   * }
   * ```
   */
  query?: Record<string, string>;
}

/**
 * @internal
 */
export type OidcWrappedConfig = Omit<OidcConfig, 'issuer' | 'name'>;

interface ProviderState {
  state: string;
  nonce: string;
  redirect: string;
}

/**
 * @internal
 */
export interface IdTokenResponse {
  idToken: string;
  claims: Record<string, any>;
  raw: Record<string, any>;
}

export function OidcProvider(config: OidcConfig): Provider<{ id: JWTPayload; clientID: string }> {
  const query = config.query || {};
  const scopes = config.scopes || [];

  const wk = fetch(config.issuer + '/.well-known/openid-configuration').then(async r => {
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<WellKnown>;
  });

  const jwks = wk
    .then(r => r.jwks_uri)
    .then(async uri => {
      const r = await fetch(uri);
      if (!r.ok) throw new Error(await r.text());
      return createLocalJWKSet((await r.json()) as JSONWebKeySet);
    });

  return {
    type: config.type || 'oidc',
    init(routes, ctx) {
      routes.get('/authorize', async (req, reply) => {
        const provider: ProviderState = {
          state: crypto.randomUUID(),
          nonce: crypto.randomUUID(),
          redirect: getRelativeUrl(req, './callback'),
        };
        await ctx.cookie.set({ req, reply }, 'provider', 60 * 10, provider);
        const authorization = new URL(await wk.then(r => r.authorization_endpoint));
        authorization.searchParams.set('client_id', config.clientID);
        authorization.searchParams.set('response_type', 'id_token');
        authorization.searchParams.set('response_mode', 'form_post');
        authorization.searchParams.set('state', provider.state);
        authorization.searchParams.set('nonce', provider.nonce);
        authorization.searchParams.set('redirect_uri', provider.redirect);
        authorization.searchParams.set('scope', ['openid', ...scopes].join(' '));
        for (const [key, value] of Object.entries(query)) {
          authorization.searchParams.set(key, value);
        }
        reply.redirect(authorization.toString());
        return;
      });

      const CallbackBodySchema = z.object({
        error: z.string().optional(),
        error_description: z.string().optional(),
        id_token: z.string().optional(),
      });

      routes.post('/callback', async (req, reply) => {
        const provider = await ctx.cookie.get<ProviderState>({ req, reply }, 'provider');
        if (!provider) {
          reply.redirect(getRelativeUrl(req, './authorize'));
          return;
        }
        const body = CallbackBodySchema.parse(req.body);
        const error = body.error;
        if (error) {
          throw new OauthError(error.toString() as any, body.error_description || '');
        }
        const idToken = body.id_token;
        if (!idToken) {
          throw new OauthError('invalid_request', 'Missing id_token');
        }

        const result = await jwtVerify(idToken.toString(), await jwks, {
          audience: config.clientID,
        });
        if (result.payload.nonce !== provider.nonce) {
          throw new OauthError('invalid_request', 'Invalid nonce');
        }

        return ctx.success(
          {
            req,
            reply,
          },
          {
            id: result.payload,
            clientID: config.clientID,
          },
        );
      });
    },
  };
}
