import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOIDCRestrictions: NonNullable<
  MutationResolvers['updateOIDCRestrictions']
> = async (_, { input }, { injector }) => {
  const result = await injector.get(OIDCIntegrationsProvider).updateOIDCRestrictions({
    oidcIntegrationId: input.oidcIntegrationId,
    oidcUserJoinOnly: input.oidcUserJoinOnly ?? null,
    oidcUserAccessOnly: input.oidcUserAccessOnly ?? null,
    requireInvitation: input.requireInvitation ?? null,
  });

  if (result.type === 'ok') {
    return {
      ok: {
        updatedOIDCIntegration: result.oidcIntegration,
      },
    };
  }

  return {
    error: {
      message: result.message,
    },
  };
};
