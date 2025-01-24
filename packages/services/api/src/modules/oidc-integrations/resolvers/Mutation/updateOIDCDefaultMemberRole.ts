import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOIDCDefaultMemberRole: NonNullable<
  MutationResolvers['updateOIDCDefaultMemberRole']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(OIDCIntegrationsProvider).updateOIDCDefaultMemberRole({
    roleId: input.defaultMemberRoleId,
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
