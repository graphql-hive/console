import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { redisDriver } from 'bentocache/build/src/drivers/redis';
import { Inject, Injectable, Scope } from 'graphql-modules';
import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { AuthorizationPolicyStatement } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';
import { REDIS_INSTANCE } from '../../shared/providers/redis';
import {
  findById,
  OrganizationAccessTokens,
  type OrganizationAccessToken,
} from './organization-access-tokens';
import { OrganizationMembers } from './organization-members';

export type CachedAccessToken = {
  id: string;
  organizationId: string;
  /** undefined, since older cache records might not contain this property. */
  projectId?: string | null;
  /** undefined, since older cache records might not contain this property. */
  userId?: string | null;
  authorizationPolicyStatements: Array<AuthorizationPolicyStatement>;
  hash: string;
  firstCharacters: string;
};

/**
 * Cache for performant OrganizationAccessToken lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class OrganizationAccessTokensCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(
    @Inject(REDIS_INSTANCE) redis: Redis,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    prometheusConfig: PrometheusConfig,
  ) {
    this.cache = new BentoCache({
      default: 'organizationAccessTokens',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_organization_access_tokens',
            }),
          ]
        : undefined,
      stores: {
        organizationAccessTokens: bentostore()
          .useL1Layer(
            memoryDriver({
              maxItems: 10_000,
              prefix: 'bentocache:organization-access-tokens',
            }),
          )
          .useL2Layer(
            redisDriver({ connection: redis, prefix: 'bentocache:organization-access-tokens' }),
          ),
      },
    });
  }

  private async makeCacheRecord(
    logger: Logger,
    accessToken: OrganizationAccessToken,
  ): Promise<CachedAccessToken | null> {
    logger.debug('create cache record for access token');
    let authorizationPolicyStatements: Array<AuthorizationPolicyStatement> | null = null;

    // in this case, we need to load the membership and filter down permissions based on the viewer.
    if (accessToken.userId) {
      logger.debug('personal access token detected');

      const membership = await OrganizationMembers.findOrganizationMembership({
        logger,
        pool: this.pool,
      })(accessToken.organizationId, accessToken.userId);

      // No membership? No access token!
      if (!membership) {
        logger.debug('could not find membership');
        return null;
      }

      authorizationPolicyStatements = OrganizationAccessTokens.computeAuthorizationStatements(
        accessToken,
        membership,
      );
    }

    return {
      id: accessToken.id,
      organizationId: accessToken.organizationId,
      projectId: accessToken.projectId,
      userId: accessToken.userId,
      authorizationPolicyStatements:
        authorizationPolicyStatements ?? accessToken.authorizationPolicyStatements,
      hash: accessToken.hash,
      firstCharacters: accessToken.firstCharacters,
    };
  }

  get(
    id: string,
    /** Request scoped logger so we associate the request-id with any logs occuring during the SQL lookup. */
    logger: Logger,
  ) {
    return this.cache.getOrSet({
      key: id,
      factory: async () => {
        const record = await findById({ logger, pool: this.pool })(id);
        if (!record) {
          return null;
        }

        return this.makeCacheRecord(logger, record);
      },
      ttl: '5min',
      grace: '24h',
    });
  }

  async add(logger: Logger, record: OrganizationAccessToken) {
    return this.cache.set({
      key: record.id,
      value: await this.makeCacheRecord(logger, record),
      ttl: '5min',
      grace: '24h',
    });
  }

  purge(token: Pick<OrganizationAccessToken, 'id'>) {
    return this.cache.delete({
      key: token.id,
    });
  }
}
