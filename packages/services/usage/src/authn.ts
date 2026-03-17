import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { AuthN } from '@hive/api/modules/auth/lib/authz';
import { OrganizationAccessTokenStrategy } from '@hive/api/modules/auth/lib/organization-access-token-strategy';
import { OrganizationAccessTokenValidationCache } from '@hive/api/modules/auth/providers/organization-access-token-validation-cache';
import { OrganizationAccessTokensCache } from '@hive/api/modules/organization/providers/organization-access-tokens-cache';
import { Logger } from '@hive/api/modules/shared/providers/logger';
import { PrometheusConfig } from '@hive/api/modules/shared/providers/prometheus-config';

/**
 * Creates an authentication provider for organization access tokens.
 */
export function createAuthN(args: {
  pgPool: DatabasePool;
  redis: Redis;
  isPrometheusEnabled: boolean;
}): AuthN {
  const prometheusConfig = new PrometheusConfig(args.isPrometheusEnabled);
  const organizationAccessTokensCache = new OrganizationAccessTokensCache(
    args.redis,
    args.pgPool,
    prometheusConfig,
  );
  const organizationAccessTokenValidationCache = new OrganizationAccessTokenValidationCache(
    prometheusConfig,
  );
  return new AuthN({
    strategies: [
      (logger: Logger) =>
        new OrganizationAccessTokenStrategy({
          logger,
          organizationAccessTokensCache,
          organizationAccessTokenValidationCache,
        }),
    ],
  });
}
