import type { FastifyInstance, FastifyRequest } from 'fastify';
import { compactDecrypt, CompactEncrypt, SignJWT } from 'jose';
import ms from 'ms';
import { z } from 'zod';
import { captureException } from '@sentry/node';
import { Context } from './context';
import { OauthError, UnauthorizedClientError, UnknownStateError } from './error';
import { encryptionKeys, signingKeys } from './keys';
import { validatePKCE } from './pkce';
import type { GithubProvider } from './provider/github';
import type { GoogleProvider } from './provider/google';
import type { Provider, ProviderOptions } from './provider/provider';
import { Storage, StorageAdapter } from './storage/storage';
import type { Prettify } from './util';
import { isDomainMatch } from './util';

declare module 'fastify' {
  interface FastifyRequest {
    identity: {
      provider: string;
      authorization: AuthorizationState | null;
    };
  }
}

interface AuthorizationState {
  redirect_uri: string;
  response_type: string;
  state: string;
  client_id: string;
  audience?: string;
  pkce?: {
    challenge: string;
    method: 'S256';
  };
}

/**
 * Sets the subject payload in the JWT token and returns the response.
 */
interface OnSuccessResponder<$Properties extends unknown> {
  /**
   * The `properties` are the properties of the subject. This is the shape of the subject that
   * you defined in the `subjects` field.
   */
  subject(
    properties: $Properties,
    opts?: {
      ttl?: {
        access?: number;
        refresh?: number;
      };
    },
  ): Promise<void>;
}

async function allow(
  input: {
    clientID: string;
    redirectURI: string;
    audience?: string;
  },
  req: FastifyRequest,
) {
  const redir = new URL(input.redirectURI).hostname;
  if (redir === 'localhost' || redir === '127.0.0.1') {
    return true;
  }
  const forwarded = req.headers['x-forwarded-host'];
  const host = forwarded ? new URL(`https://${forwarded}`).hostname : new URL(req.url).hostname;

  return isDomainMatch(redir, host);
}

// type Providers = {
//   github?: ReturnType<typeof GithubProvider>;
//   google?: ReturnType<typeof GoogleProvider>;
// };

export function identity<
  $Subject,
  $Providers extends Record<string, Provider<any>>,
  $Result = {
    [key in keyof $Providers]: Prettify<
      {
        provider: key;
      } & ($Providers[key] extends Provider<infer T> ? T : {})
    >;
  }[keyof $Providers],
>(input: {
  server: FastifyInstance;
  prefix: string;
  issuer: string;
  /**
   * The success callback that's called when the user completes the flow.
   * This is called after the user has been redirected back to your app after the OAuth flow.
   */
  success(
    response: OnSuccessResponder<$Subject>,
    input: $Result,
    req: FastifyRequest,
  ): Promise<void>;
  providers: $Providers;
  storage: StorageAdapter;
}) {
  const issuer = input.issuer;
  const storage = input.storage;

  /**
   * Set the TTL, in seconds, for access and refresh tokens.
   */
  const ttl = {
    /**
     * Interval in seconds where the access token is valid.
     */
    access: ms('30d') / 1000,
    /**
     * Interval in seconds where the refresh token is valid.
     */
    refresh: ms('1y') / 1000,
    /**
     * Interval in seconds where refresh token reuse is allowed. This helps mitigrate
     * concurrency issues.
     */
    reuse: ms('60s') / 1000,
  };

  const allEncryption = encryptionKeys(storage);
  const allSigningKeys = signingKeys(storage);
  const signingKey = allSigningKeys.then(all => all[0]);
  const encryptionKey = allEncryption.then(all => all[0]);

  const auth: Omit<ProviderOptions<unknown>, 'name'> = {
    storage,
    async success(ctx, properties, successOpts) {
      await input.success(
        {
          async subject(properties, subjectOpts) {
            const authorization = await getAuthorization(ctx);
            const subject = await resolveSubject(properties);
            await successOpts?.invalidate?.(subject);
            if (authorization.response_type === 'token') {
              const location = new URL(authorization.redirect_uri);
              const tokens = await generateTokens({
                subject,
                properties,
                clientID: authorization.client_id,
                ttl: {
                  access: subjectOpts?.ttl?.access ?? ttl.access,
                  refresh: subjectOpts?.ttl?.refresh ?? ttl.refresh,
                },
              });
              location.hash = new URLSearchParams({
                access_token: tokens.access,
                refresh_token: tokens.refresh,
                state: authorization.state || '',
              }).toString();
              auth.cookie.unset(ctx, 'authorization');
              ctx.reply.redirect(location.toString(), 302);
              return;
            }
            if (authorization.response_type === 'code') {
              const code = crypto.randomUUID();
              await Storage.set(
                storage,
                ['oauth:code', code],
                {
                  properties,
                  subject,
                  redirectURI: authorization.redirect_uri,
                  clientID: authorization.client_id,
                  pkce: authorization.pkce,
                  ttl: {
                    access: subjectOpts?.ttl?.access ?? ttl.access,
                    refresh: subjectOpts?.ttl?.refresh ?? ttl.refresh,
                  },
                },
                60,
              );
              const location = new URL(authorization.redirect_uri);
              location.searchParams.set('code', code);
              location.searchParams.set('state', authorization.state || '');
              auth.cookie.unset(ctx, 'authorization');
              ctx.reply.redirect(location.toString(), 302);
              return;
            }
            throw new OauthError(
              'invalid_request',
              `Unsupported response_type: ${authorization.response_type}`,
            );
          },
        },
        {
          provider: ctx.req.identity.provider,
          ...(properties as any),
        },
        ctx.req,
      );
    },
    cookie: {
      async set(ctx, key, maxAge, value) {
        ctx.reply.setCookie(key, await encrypt(value), {
          maxAge,
          httpOnly: true,
          ...(ctx.req.originalUrl.startsWith('https://')
            ? {
                secure: true,
                sameSite: 'none',
              }
            : {}),
        });
      },
      async get(ctx, key) {
        const raw = ctx.req.cookies[key];
        if (!raw) {
          return;
        }
        return decrypt(raw).catch(err => {
          ctx.req.log.error('Failed to decrypt %s cookie (error=%s)', key, err);
        });
      },
      unset(ctx, key) {
        ctx.reply.clearCookie(key);
      },
    },
    async invalidate(subject: string): Promise<void> {
      console.log('Invalidating', subject);
    },
  };

  input.server.register(
    (instance, _opts, next) => {
      for (const [name, value] of Object.entries(input.providers)) {
        console.log('Setting prefix', instance.prefix + '/' + name);
        instance.register(
          (perProviderInstance, _opts, next) => {
            perProviderInstance.decorateRequest('identity', {
              provider: name,
              authorization: null,
            });

            value.init(perProviderInstance, {
              name,
              ...auth,
            });
            next();
          },
          {
            prefix: name,
          },
        );
      }

      instance.get(
        '/.well-known/jwks.json',
        // cors({
        //   origin: '*',
        //   allowHeaders: ['*'],
        //   allowMethods: ['GET'],
        //   credentials: false,
        // }),
        async (req, res) => {
          const all = await allSigningKeys;
          res.send({
            keys: all.map(item => ({
              ...item.jwk,
              exp: item.expired ? Math.floor(item.expired.getTime() / 1000) : undefined,
            })),
          });
          return;
        },
      );

      instance.get(
        '/.well-known/oauth-authorization-server',
        // cors({
        //   origin: '*',
        //   allowHeaders: ['*'],
        //   allowMethods: ['GET'],
        //   credentials: false,
        // }),
        async (_req, res) => {
          res.send({
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            jwks_uri: `${issuer}/.well-known/jwks.json`,
            response_types_supported: ['code'],
          });
          return;
        },
      );

      const TokenBodySchema = z.discriminatedUnion('grant_type', [
        z.object({
          grant_type: z.literal('authorization_code'),
          code: z.string(),
          redirect_uri: z.string(),
          client_id: z.string(),
          code_verifier: z.string().optional(),
        }),
        z.object({
          grant_type: z.literal('refresh_token'),
          refresh_token: z.string(),
        }),
      ]);
      instance.post(
        '/token',
        // cors({
        //   origin: '*',
        //   allowHeaders: ['*'],
        //   allowMethods: ['POST'],
        //   credentials: false,
        // }),
        async (req, res) => {
          const formDataParseResult = TokenBodySchema.safeParse(req.body);

          if (!formDataParseResult.success) {
            res.status(400);
            res.send({
              error: 'invalid_request',
              error_description: formDataParseResult.error.message,
            });
            return;
          }

          const formData = formDataParseResult.data;

          if (formData.grant_type === 'authorization_code') {
            const code = formData.code;
            // TODO: add a method to get oauth:code from Postgres and remove it within the same action
            // storage.oauth.code.getAndDelete(code): Result | null

            const key = ['oauth:code', code.toString()];
            const payload = await Storage.get<{
              properties: any;
              clientID: string;
              redirectURI: string;
              subject: string;
              ttl: {
                access: number;
                refresh: number;
              };
              pkce?: AuthorizationState['pkce'];
            }>(storage, key);
            if (!payload) {
              res.status(400);
              res.send({
                error: 'invalid_grant',
                error_description: 'Authorization code has been used or expired',
              });
              return;
            }
            await Storage.remove(storage, key);
            if (payload.redirectURI !== formData.redirect_uri) {
              res.status(400);
              res.send({
                error: 'invalid_redirect_uri',
                error_description: 'Redirect URI mismatch',
              });
              return;
            }
            if (payload.clientID !== formData.client_id) {
              res.status(403);
              res.send({
                error: 'unauthorized_client',
                error_description: 'Client is not authorized to use this authorization code',
              });
              return;
            }

            if (payload.pkce) {
              const codeVerifier = formData.code_verifier;
              if (!codeVerifier) {
                res.status(400);
                res.send({
                  error: 'invalid_grant',
                  error_description: 'Missing code_verifier',
                });
                return;
              }

              if (
                !(await validatePKCE(codeVerifier, payload.pkce.challenge, payload.pkce.method))
              ) {
                res.status(400);
                res.send({
                  error: 'invalid_grant',
                  error_description: 'Code verifier does not match',
                });
                return;
              }
            }
            const tokens = await generateTokens(payload);
            res.send({
              access_token: tokens.access,
              refresh_token: tokens.refresh,
            });
            return;
          }

          if (formData.grant_type === 'refresh_token') {
            const refreshToken = formData.refresh_token;
            const splits = refreshToken.toString().split(':');
            const token = splits.pop()!;
            const subject = splits.join(':');
            const key = ['oauth:refresh', subject, token];
            const payload = await Storage.get<{
              type: string;
              properties: any;
              clientID: string;
              subject: string;
              ttl: {
                access: number;
                refresh: number;
              };
              nextToken: string;
              timeUsed?: number;
            }>(storage, key);
            if (!payload) {
              res.status(400);
              res.send({
                error: 'invalid_grant',
                error_description: 'Refresh token has been used or expired',
              });
              return;
            }
            const generateRefreshToken = !payload.timeUsed;
            if (ttl.reuse <= 0) {
              // no reuse interval, remove the refresh token immediately
              // TODO: remove refresh token db record
              await Storage.remove(storage, key);
            } else if (!payload.timeUsed) {
              payload.timeUsed = Date.now();
              // TODO: persist refresh token and the payload in db
              await Storage.set(storage, key, payload, ttl.refresh);
            } else if (Date.now() > payload.timeUsed + ttl.reuse * 1000) {
              // token was reused past the allowed interval
              await auth.invalidate(subject);
              res.status(400);
              res.send({
                error: 'invalid_grant',
                error_description: 'Refresh token has been used or expired',
              });
              return;
            }
            const tokens = await generateTokens(payload, {
              generateRefreshToken,
            });
            res.send({
              access_token: tokens.access,
              refresh_token: tokens.refresh,
            });
            return;
          }

          throw new Error('Invalid grant_type');
        },
      );

      const AuthorizeQueryParamsSchema = z.object({
        provider: z.string(),
        response_type: z.string(),
        redirect_uri: z.string(),
        state: z.string().optional(),
        client_id: z.string(),
        audience: z.string().optional(),
        code_challenge: z.string().optional(),
        code_challenge_method: z.string().optional(),
      });
      instance.get('/authorize', async (req, reply) => {
        const queryParamsParseResult = AuthorizeQueryParamsSchema.safeParse(req.query);

        if (!queryParamsParseResult.success) {
          reply.status(400);
          reply.send({
            error: 'invalid_request',
            error_description: queryParamsParseResult.error.message,
          });
          return;
        }

        const queryParams = queryParamsParseResult.data;

        const provider = queryParams.provider;
        const response_type = queryParams.response_type;
        const redirect_uri = queryParams.redirect_uri;
        const state = queryParams.state;
        const client_id = queryParams.client_id;
        const audience = queryParams.audience;
        const code_challenge = queryParams.code_challenge;
        const code_challenge_method = queryParams.code_challenge_method;
        const authorization: AuthorizationState = {
          response_type,
          redirect_uri,
          state,
          client_id,
          audience,
          pkce:
            code_challenge && code_challenge_method
              ? {
                  challenge: code_challenge,
                  method: code_challenge_method,
                }
              : undefined,
        } as AuthorizationState;

        if (!req.identity) {
          req.identity = {};
        }
        req.identity.authorization = authorization;

        // if (input.start) {
        //   await input.start(c.req.raw);
        // }

        if (
          !(await allow(
            {
              clientID: client_id,
              redirectURI: redirect_uri,
              audience,
            },
            req,
          ))
        ) {
          throw new UnauthorizedClientError(client_id, redirect_uri);
        }

        await auth.cookie.set(
          {
            req,
            reply,
          },
          'authorization',
          60 * 60 * 24,
          authorization,
        );

        if (!provider) {
          throw new Error('No provider specified');
        }

        reply.redirect(`/${input.prefix}/${provider}/authorize`, 302);
        return;
      });

      instance.setErrorHandler(async (err, req, reply) => {
        req.log.error(err);
        captureException(err);

        const cause = err.cause;

        if (cause instanceof UnknownStateError) {
          reply.status(400);
          reply.header('content-type', 'text/plain');
          reply.send(cause.message);
          return;
        }

        const oauth =
          cause instanceof OauthError
            ? cause
            : new OauthError('server_error', cause instanceof Error ? cause.message : err.message);

        const authorization = await getAuthorization({ req, reply });
        const url = new URL(authorization.redirect_uri);
        url.searchParams.set('error', oauth.error);
        url.searchParams.set('error_description', oauth.description);
        reply.redirect(url.toString(), 302);
        return;
      });

      next();
    },
    {
      prefix: input.prefix,
    },
  );

  async function getAuthorization(ctx: Context) {
    const match = (await auth.cookie.get(ctx, 'authorization')) || ctx.req.identity.authorization;
    if (!match) throw new UnknownStateError();
    return match as AuthorizationState;
  }

  async function generateTokens(
    value: {
      clientID: string;
      subject: string;
      properties: unknown;
      ttl: {
        access: number;
        refresh: number;
      };
      timeUsed?: number;
      nextToken?: string;
    },
    opts?: {
      generateRefreshToken?: boolean;
    },
  ) {
    const refreshToken = value.nextToken ?? crypto.randomUUID();
    if (opts?.generateRefreshToken ?? true) {
      /**
       * Generate and store the next refresh token after the one we are currently returning.
       * Reserving these in advance avoids concurrency issues with multiple refreshes.
       * Similar treatment should be given to any other values that may have race conditions,
       * for example if a jti claim was added to the access token.
       */
      const refreshValue = {
        ...value,
        nextToken: crypto.randomUUID(),
      };
      delete refreshValue.timeUsed;
      // TODO: a method to write a refresh token in PG
      // storage.refresh_tokens.set({
      //   subject: value.subject,
      //   token: refreshToken,
      //   value: refreshValue,
      //   ttl: value.ttl.refresh
      // })
      await Storage.set(
        storage,
        ['oauth:refresh', value.subject, refreshToken],
        refreshValue,
        value.ttl.refresh,
      );
    }
    return {
      access: await new SignJWT({
        mode: 'access',
        properties: value.properties,
        aud: value.clientID,
        iss: issuer,
        sub: value.subject,
      })
        .setExpirationTime(Math.floor((value.timeUsed ?? Date.now()) / 1000 + value.ttl.access))
        .setProtectedHeader(
          await signingKey.then(k => ({
            alg: k.alg,
            kid: k.id,
            typ: 'JWT',
          })),
        )
        .sign(await signingKey.then(item => item.private)),
      refresh: [value.subject, refreshToken].join(':'),
    };
  }

  async function encrypt(value: any) {
    return await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(value)))
      .setProtectedHeader({ alg: 'RSA-OAEP-512', enc: 'A256GCM' })
      .encrypt(await encryptionKey.then(k => k.public));
  }

  async function decrypt(value: string) {
    return JSON.parse(
      new TextDecoder().decode(
        await compactDecrypt(value, await encryptionKey.then(v => v.private)).then(
          value => value.plaintext,
        ),
      ),
    );
  }
}

async function resolveSubject(properties: unknown) {
  const jsonString = JSON.stringify(properties);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 16);
}
