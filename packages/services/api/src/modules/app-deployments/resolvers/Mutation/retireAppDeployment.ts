import { AppDeploymentsManager } from '../../providers/app-deployments-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const retireAppDeployment: NonNullable<MutationResolvers['retireAppDeployment']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector.get(AppDeploymentsManager).retireAppDeployment({
    reference: input.target ?? null,
    appDeployment: {
      name: input.appName,
      version: input.appVersion,
    },
    force: input.force ?? undefined,
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
        protectionDetails: result.protectionDetails
          ? {
              lastUsed: result.protectionDetails.lastUsed?.toISOString() ?? null,
              daysSinceLastUsed: result.protectionDetails.daysSinceLastUsed,
              requiredMinDaysInactive: result.protectionDetails.requiredMinDaysInactive,
              currentTrafficPercentage: result.protectionDetails.currentTrafficPercentage,
              maxTrafficPercentage: result.protectionDetails.maxTrafficPercentage,
            }
          : null,
      },
      ok: null,
    };
  }

  return {
    error: null,
    ok: {
      retiredAppDeployment: result.appDeployment,
    },
  };
};
