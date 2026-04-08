import { AppDeploymentsManager } from '../../providers/app-deployments-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createAppDeployment: NonNullable<MutationResolvers['createAppDeployment']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector.get(AppDeploymentsManager).createAppDeployment({
    reference: input.target ?? null,
    appDeployment: {
      name: input.appName,
      version: input.appVersion,
    },
    hashes: input.hashes,
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.error.message,
        details: result.error.details,
      },
      ok: null,
    };
  }

  return {
    error: null,
    ok: {
      createdAppDeployment: result.appDeployment,
      existingHashes: result.existingHashes,
    },
  };
};
