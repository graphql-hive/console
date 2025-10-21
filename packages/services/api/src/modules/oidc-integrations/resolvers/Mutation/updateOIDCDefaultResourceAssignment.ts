import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOIDCDefaultResourceAssignment: NonNullable<
  MutationResolvers['updateOIDCDefaultResourceAssignment']
> = async (_parent, { input }, { injector }) => {
  const result = await injector.get(OIDCIntegrationsProvider).updateOIDCDefaultAssignedResources({
    assignedResources: input.resources,
    oidcIntegrationId: input.oidcIntegrationId,
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
      },
    };
  }

  return {
    ok: {
      updatedOIDCIntegration: result.oidcIntegration,
    },
  };
};
