import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const verifyOIDCDomainChallenge: NonNullable<
  MutationResolvers['verifyOIDCDomainChallenge']
> = async (_parent, args, ctx) => {
  const result = await ctx.injector.get(OIDCIntegrationsProvider).verifyChallenge({
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
      verifiedOIDCIntegrationDomain: result.domain,
    },
  };
};
