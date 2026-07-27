import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import { maskToken } from '@hive/service-common';
import type { Token } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { atomic } from '../../../shared/helpers';
import type {
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from '../../auth/providers/scopes';
import { Logger } from '../../shared/providers/logger';
import type { TargetSelector } from '../../shared/providers/storage';
import { TargetTokenCache } from './target-token-cache';
import { TargetTokenStorage } from './target-token-storage';

export interface TokenSelector {
  token: string;
}

interface CreateTokenInput extends TargetSelector {
  name: string;
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>;
}

export interface CreateTokenResult extends Token {
  secret: string;
}

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class TokenStorage {
  private logger: Logger;

  constructor(
    logger: Logger,
    private targetTokenStorage: TargetTokenStorage,
    private targetTokenCache: TargetTokenCache,
  ) {
    this.logger = logger.child({ source: 'TokenStorage' });
  }

  async createToken(input: CreateTokenInput) {
    this.logger.debug('Creating new token (input=%o)', input);

    const secret = randomBytes(16).toString('hex');
    const token = await this.targetTokenStorage.createToken({
      token: createTokenHash(secret),
      tokenAlias: maskToken(secret),
      name: input.name,
      target: input.targetId,
      project: input.projectId,
      organization: input.organizationId,
      scopes: input.scopes,
    });

    await this.targetTokenCache.add(token);

    return { ...token, secret };
  }

  async deleteTokens(input: {
    targetId: string;
    tokenIds: readonly string[];
  }): Promise<readonly string[]> {
    this.logger.debug('Deleting tokens (input=%o)', input);

    const deletedTokens = await this.targetTokenStorage.deleteTokens({
      targetId: input.targetId,
      tokens: input.tokenIds,
    });
    await this.targetTokenCache.purge(deletedTokens);

    return deletedTokens;
  }

  async invalidateTokens(tokens: string[]) {
    this.logger.debug('Invalidating tokens (size=%s)', tokens.length);

    await this.targetTokenCache.purge(tokens);
  }

  async getTokens(selector: TargetSelector) {
    this.logger.debug('Fetching tokens (selector=%o)', selector);

    return await this.targetTokenStorage.getTokens({ targetId: selector.targetId });
  }

  @atomic<TokenSelector>(({ token }) => token)
  async getToken({ token }: TokenSelector) {
    try {
      // Target-token secrets are 16 random bytes encoded as hexadecimal.
      if (token.length !== 32) {
        throw new HiveError(`Incorrect length: received ${token.length}, expected 32`);
      }

      this.logger.debug('Fetching token (token=%s)', maskToken(token));
      const tokenInfo = await this.targetTokenCache.get(token);

      if (!tokenInfo) {
        throw new HiveError('Not found');
      }

      return tokenInfo;
    } catch (error: any) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);

      this.logger.error('Failed to fetch token (error=%s)', errorText);
      throw new HiveError('Invalid token provided', {
        originalError: error,
      });
    }
  }
}

function createTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
