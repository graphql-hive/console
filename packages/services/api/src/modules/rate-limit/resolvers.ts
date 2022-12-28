import { Logger } from './../shared/providers/logger';
import { RateLimitModule } from './__generated__/types';
import { RateLimitProvider } from './providers/rate-limit.provider';

export const resolvers: RateLimitModule.Resolvers = {
  Organization: {
    rateLimit: async (org, _args, { injector }) => {
      let limitedForOperations = false;
      const logger = injector.get(Logger);

      try {
        const operationsRateLimit = await injector.get(RateLimitProvider).checkRateLimit({
          entityType: 'organization',
          id: org.id,
          type: 'operations-reporting',
          token: null,
        });

        logger.debug('Fetched rate-limit info:', { orgId: org.id, operationsRateLimit });
        limitedForOperations = operationsRateLimit.limited;
      } catch (e) {
        logger.error('Failed to fetch rate-limit info:', org.id, e);
      }

      return {
        limitedForOperations,
        operations: org.monthlyRateLimit.operations,
        retentionInDays: org.monthlyRateLimit.retentionInDays,
      };
    },
  },
};
