import { LRUCache } from 'lru-cache';
import { ServiceLogger } from '@hive/service-common';
import type { TokensApi } from '@hive/tokens';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { tokenRequests } from './metrics';

export enum TokenStatus {
  NotFound,
  NoAccess,
}

export type TokensResponse = {
  organization: string;
  project: string;
  target: string;
  scopes: readonly string[];
};

type Token = TokensResponse | TokenStatus;

export function createTokens(config: { endpoint: string; logger: ServiceLogger }) {
  const endpoint = config.endpoint.replace(/\/$/, '');
  const tokensApi = createTRPCProxyClient<TokensApi>({
    links: [
      httpLink({
        url: `${endpoint}/trpc`,
        fetch,
        headers: {
          'x-requesting-service': 'usage',
        },
      }),
    ],
  });
  const tokens = new LRUCache<string, Token>({
    max: 1000,
    ttl: 30_000,
    allowStale: false,
    // If a cache entry is stale or missing, this method is called
    // to fill the cache with fresh data.
    // This method is called only once per cache key,
    // even if multiple requests are waiting for it.
    async fetchMethod(token) {
      tokenRequests.inc();
      try {
        const info = await tokensApi.getToken.query({
          token,
        });

        if (info) {
          const result = info.scopes.includes('target:registry:write')
            ? {
                target: info.target,
                project: info.project,
                organization: info.organization,
                scopes: info.scopes,
              }
            : TokenStatus.NoAccess;
          return result;
        }
        return TokenStatus.NotFound;
      } catch (error) {
        config.logger.error('Failed to fetch fresh token', error);
        return TokenStatus.NotFound;
      }
    },
  });

  return {
    async fetch(token: string) {
      return (await tokens.fetch(token)) ?? TokenStatus.NotFound;
    },
    isNotFound(token: Token): token is TokenStatus.NotFound {
      return token === TokenStatus.NotFound;
    },
    isNoAccess(token: Token): token is TokenStatus.NoAccess {
      return token === TokenStatus.NoAccess;
    },
  };
}

export type Tokens = ReturnType<typeof createTokens>;
