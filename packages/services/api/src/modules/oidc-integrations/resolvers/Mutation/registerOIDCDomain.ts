import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const registerOIDCDomain: NonNullable<MutationResolvers['registerOIDCDomain']> = async (
  _parent,
  args,
  ctx,
) => {
  const result = await ctx.injector.get(OIDCIntegrationsProvider).registerDomain({
    oidcIntegrationId: args.input.oidcIntegrationId,
    domain: args.input.domainName,
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
      createdOIDCIntegrationDomain: result.domain,
      oidcIntegration: result.integration,
    },
  };
};
