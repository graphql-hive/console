import { APP_DEPLOYMENT_TIMINGS_ENABLED } from '../../providers/app-deployments-enabled-token';
import { AppDeploymentsManager } from '../../providers/app-deployments-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addDocumentsToAppDeployment: NonNullable<
  MutationResolvers['addDocumentsToAppDeployment']
> = async (_parent, { input }, { injector }) => {
  const result = await injector.get(AppDeploymentsManager).addDocumentsToAppDeployment({
    reference: input.target ?? null,
    appDeployment: {
      name: input.appName,
      version: input.appVersion,
    },
    documents: input.documents,
    format: input.format === 'SHA256' ? 'sha256' : input.format === 'CUSTOM' ? 'custom' : null,
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

  const timingsEnabled = injector.get<boolean>(APP_DEPLOYMENT_TIMINGS_ENABLED);

  return {
    error: null,
    ok: {
      appDeployment: result.appDeployment,
      timings: timingsEnabled && input.showTimings ? result.timing : null,
    },
  };
};
