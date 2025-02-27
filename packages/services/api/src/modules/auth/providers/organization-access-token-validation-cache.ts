import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/build/src/drivers/memory';
import { Injectable, Scope } from 'graphql-modules';
import { prometheusPlugin } from '@bentocache/plugin-prometheus';
import { PrometheusConfig } from '../../shared/providers/prometheus-config';

/**
 * Cache for performant OrganizationAccessToken lookups.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class OrganizationAccessTokenValidationCache {
  private cache: BentoCache<{ store: ReturnType<typeof bentostore> }>;

  constructor(prometheusConfig: PrometheusConfig) {
    this.cache = new BentoCache({
      default: 'organizationAccessTokenValidation',
      plugins: prometheusConfig.isEnabled
        ? [
            prometheusPlugin({
              prefix: 'bentocache_organization_access_token_validation',
            }),
          ]
        : undefined,
      stores: {
        organizationAccessTokenValidation: bentostore().useL1Layer(
          memoryDriver({
            maxItems: 10_000,
            prefix: 'bentocache:organization-access-token-validation',
          }),
        ),
      },
    });
  }

  getOrSetForever: typeof this.cache.getOrSetForever = (...args) =>
    this.cache.getOrSetForever(...args);
}
