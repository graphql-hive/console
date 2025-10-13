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
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
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
