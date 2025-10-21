import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE } from '../../shared/providers/redis';
import { OrganizationMembers, type OrganizationMembership } from './organization-members';
import { PersonalAccessTokens, type PersonalAccessToken } from './personal-access-tokens';

export type CachedPersonalAccessToken = Omit<
  PersonalAccessToken,
  'resolveAuthorizationPolicyStatements'
> & {
  authorizationPolicyStatements: ReturnType<
    PersonalAccessToken['resolveAuthorizationPolicyStatements']
  >;
};

type PersonalAccessTokeDeleteInput = Pick<PersonalAccessToken, 'id'>;

/**
 * Cache for performant PersonalAccessToken lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class PersonalAccessTokensCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'personalAccessTokens',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_personal_access_tokens',
            }),
          ]
        : undefined,
      stores: {
        personalAccessTokens: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:personal-access-tokens',
            }),
          )
          .useL2Layer(
            redisDriver({ connection: redis, prefix: 'bentocache:personal-access-tokens' }),
          ),
      },
    });
  }

  private makeCachedPersonalAccessToken(
    personalAccessToken: PersonalAccessToken,
    membership: OrganizationMembership,
  ) {
    const authorizationPolicyStatements =
      personalAccessToken.resolveAuthorizationPolicyStatements(membership);

    return {
      ...personalAccessToken,
      authorizationPolicyStatements,
    };
  }

  private async resolvePersonalAccessToken(
    id: string,
    logger: Logger,
  ): Promise<CachedPersonalAccessToken | null> {
    logger.debug('resolve personal access token (personalAccessTokenId=%s', id);
    const personalAccessToken = await PersonalAccessTokens.findById({
      logger,
      pool: this.pool,
    })(id);

    if (!personalAccessToken) {
      return null;
    }

    const membership = await OrganizationMembers.findOrganizationMembership({
      logger,
      pool: this.pool,
    })(personalAccessToken.organizationId, personalAccessToken.userId);

    if (!membership) {
      return null;
    }

    return this.makeCachedPersonalAccessToken(personalAccessToken, membership);
  }

  get(
    id: string,
    /** Request scoped logger so we associate the request-id with any logs occuring during the SQL lookup. */
    logger: Logger,
  ) {
    return this.cache.getOrSet({
      key: id,
      factory: () => {
        return this.resolvePersonalAccessToken(id, logger);
      },
      ttl: '5min',
      grace: '24h',
    });
  }

  add(token: PersonalAccessToken, membership: OrganizationMembership) {
    const value = this.makeCachedPersonalAccessToken(token, membership);
    return this.cache.set({
      key: value.id,
      value,
      ttl: '5min',
      grace: '24h',
    });
  }

  /** Delete a personal access token from the cache e.g. upon deletion or update of permissions */
  delete(token: PersonalAccessTokeDeleteInput) {
    return this.cache.delete({
      key: token.id,
    });
  }
}
