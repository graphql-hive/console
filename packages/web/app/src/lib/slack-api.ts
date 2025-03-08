import { stringify } from 'node:querystring';
import { z } from 'zod';
import { fetchJson } from './fetch-json';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SlackAPI {
  // ==================================
  // Data Utilities
  // ==================================

  export const createOauth2AuthorizeUrl = (parameters: {
    state: string;
    clientId: string;
    redirectUrl: string;
    scopes: string[];
  }) => {
    const url = new URL('https://slack.com/oauth/v2/authorize');
    const searchParams = new URLSearchParams({
      scope: parameters.scopes.join(','),
      client_id: parameters.clientId,
      redirect_uri: parameters.redirectUrl,
      state: parameters.state,
    });

    url.search = searchParams.toString();
    return url.toString();
  };

  // ==================================
  // Request Methods
  // ==================================

  // ----------------------------------
  // OAuth2AccessResult
  // ----------------------------------

  const OAuth2AccessResult = z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      access_token: z.string(),
    }),
    z.object({
      ok: z.literal(false),
      error: z.string(),
    }),
  ]);

  export type OAuth2AccessResult = z.infer<typeof OAuth2AccessResult>;

  export interface OAuth2AccessPayload {
    clientId: string;
    clientSecret: string;
    code: string;
  }

  export async function requestOauth2Access(payload: OAuth2AccessPayload) {
    return fetchJson(
      'https://slack.com/api/oauth.v2.access',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: stringify({
          client_id: payload.clientId,
          client_secret: payload.clientSecret,
          code: payload.code,
        }),
      },
      OAuth2AccessResult,
    );
  }
}
