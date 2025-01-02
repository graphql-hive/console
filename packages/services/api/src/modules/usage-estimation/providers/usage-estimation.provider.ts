import { Inject, Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import type { UsageEstimatorApi } from '@hive/usage-estimator';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import type { UsageEstimationServiceConfig } from './tokens';
import { USAGE_ESTIMATION_SERVICE_CONFIG } from './tokens';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class UsageEstimationProvider {
  private logger: Logger;
  private usageEstimator;

  constructor(
    logger: Logger,
    @Inject(USAGE_ESTIMATION_SERVICE_CONFIG)
    usageEstimationConfig: UsageEstimationServiceConfig,
    private idTranslator: IdTranslator,
    private session: Session,
  ) {
    this.logger = logger.child({ service: 'UsageEstimationProvider' });
    this.usageEstimator = usageEstimationConfig.endpoint
      ? createTRPCProxyClient<UsageEstimatorApi>({
          links: [
            httpLink({
              url: `${usageEstimationConfig.endpoint}/trpc`,
              fetch,
            }),
          ],
        })
      : null;
  }

  @traceFn('UsageEstimation.estimateOperations', {
    initAttributes: input => ({
      'hive.usageEstimation.operations.organizationId': input.organizationId,
    }),
    resultAttributes: result => ({
      'hive.usageEstimation.operations.estimated': result ?? 0,
    }),
  })
  async _estimateOperationsForOrganization(input: {
    organizationId: string;
    month: number;
    year: number;
  }): Promise<number | null> {
    this.logger.debug('Estimation operations, input: %o', input);

    if (!this.usageEstimator) {
      this.logger.warn('Usage estimator is not available due to missing configuration');

      return null;
    }

    const result = await this.usageEstimator.estimateOperationsForOrganization.query({
      organizationId: input.organizationId,
      year: input.year,
      month: input.month,
    });

    return result.totalOperations;
  }

  async estimateOperationsForOrganization(input: {
    organizationSlug: string;
    month: number;
    year: number;
  }): Promise<number | null> {
    const organizationId = await this.idTranslator.translateOrganizationId({
      organizationSlug: input.organizationSlug,
    });

    await this.session.assertPerformAction({
      action: 'billing:describe',
      organizationId,
      params: {
        organizationId,
      },
    });

    return await this._estimateOperationsForOrganization({
      organizationId,
      year: input.year,
      month: input.month,
    });
  }
}
