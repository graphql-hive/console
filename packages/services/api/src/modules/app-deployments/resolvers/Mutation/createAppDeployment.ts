import { AppDeploymentsManager } from '../../providers/app-deployments-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createAppDeployment: NonNullable<MutationResolvers['createAppDeployment']> = async (
  _parent,
  { input },
  { injector },
) => {
  const isSha256 = input.format === 'SHA256';

  if (isSha256 && (!input.hashes || input.hashes.length === 0)) {
    return {
      error: {
        message: 'hashes are required when using SHA256 format.',
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
    hashes: isSha256 ? input.hashes! : undefined,
    format: isSha256 ? 'sha256' : input.format === 'CUSTOM' ? 'custom' : null,
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
