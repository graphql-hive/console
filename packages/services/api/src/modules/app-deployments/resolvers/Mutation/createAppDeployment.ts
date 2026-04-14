import { AppDeploymentsManager } from '../../providers/app-deployments-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createAppDeployment: NonNullable<MutationResolvers['createAppDeployment']> = async (
  _parent,
  { input },
  { injector },
) => {
  const isV2 = input.format === 'V2';

  if (isV2 && (!input.hashes || input.hashes.length === 0)) {
    return {
      error: {
        message: 'hashes are required when using V2 format.',
        details: null,
      },
      ok: null,
    };
  }

  const result = await injector.get(AppDeploymentsManager).createAppDeployment({
    reference: input.target ?? null,
    appDeployment: {
      name: input.appName,
      version: input.appVersion,
    },
    hashes: isV2 ? input.hashes! : undefined,
    format: isV2 ? 'v2' : input.format === 'V1' ? 'v1' : null,
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
