import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import { AuthN } from '@hive/api/modules/auth/lib/authz';
import { OrganizationAccessTokenStrategy } from '@hive/api/modules/auth/lib/organization-access-token-strategy';
import { PersonalAccessTokenSessionStrategy } from '@hive/api/modules/auth/lib/personal-access-token-strategy';
import { AccessTokenValidationCache } from '@hive/api/modules/auth/providers/access-token-validation-cache';
import { OrganizationAccessTokensCache } from '@hive/api/modules/organization/providers/organization-access-tokens-cache';
import { PersonalAccessTokensCache } from '@hive/api/modules/organization/providers/personal-access-tokens-cache';
import { Logger } from '@hive/api/modules/shared/providers/logger';
import { PrometheusConfig } from '@hive/api/modules/shared/providers/prometheus-config';

/**
 * Creates an authentication provider for organization access tokens.
 */
export function createAuthN(args: {
  pgPool: DatabasePool;
  redis: Redis;
  isPrometheusEnabled: boolean;
  logger: Logger;
}): AuthN {
  const prometheusConfig = new PrometheusConfig(args.isPrometheusEnabled);
  const organizationAccessTokensCache = new OrganizationAccessTokensCache(
    args.redis,
    args.pgPool,
    prometheusConfig,
  );
  const personalAccessTokensCache = new PersonalAccessTokensCache(
    args.redis,
    args.pgPool,
    prometheusConfig,
  );

  const accessTokenValidationCache = new AccessTokenValidationCache(prometheusConfig);
  return new AuthN({
    strategies: [
      (logger: Logger) =>
        new OrganizationAccessTokenStrategy({
          logger,
          organizationAccessTokensCache,
          accessTokenValidationCache,
        }),
      (logger: Logger) =>
        new PersonalAccessTokenSessionStrategy(
          logger,
          personalAccessTokensCache,
          accessTokenValidationCache,
        ),
    ],
  });
}
