import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOIDCDomain: NonNullable<MutationResolvers['deleteOIDCDomain']> = async (
  _parent,
  args,
  ctx,
) => {
  const result = await ctx.injector.get(OIDCIntegrationsProvider).deleteDomain({
    domainId: args.input.oidcDomainId,
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
      deletedOIDCIntegrationId: args.input.oidcDomainId,
    },
  };
};
