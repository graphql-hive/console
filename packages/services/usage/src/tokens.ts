import { TargetTokenCache } from '@hive/api/modules/token/providers/target-token-cache';
import { ServiceLogger } from '@hive/service-common';
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

export function createTokens(config: { cache: TargetTokenCache; logger: ServiceLogger }) {
  async function fetch(token: string): Promise<Token> {
    tokenRequests.inc();

    try {
      const info = await config.cache.get(token);

      if (!info) {
        return TokenStatus.NotFound;
      }

      return info.scopes.includes('target:registry:write')
        ? {
            target: info.target,
            project: info.project,
            organization: info.organization,
            scopes: info.scopes,
          }
        : TokenStatus.NoAccess;
    } catch (error) {
      config.logger.error('Failed to fetch target token (error=%s)', error);
      return TokenStatus.NotFound;
    }
  }

  return {
    async fetch(token: string) {
      return await fetch(token);
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
