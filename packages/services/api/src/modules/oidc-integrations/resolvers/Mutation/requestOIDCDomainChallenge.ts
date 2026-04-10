import { OIDCIntegrationsProvider } from '../../providers/oidc-integrations.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const requestOIDCDomainChallenge: NonNullable<
  MutationResolvers['requestOIDCDomainChallenge']
> = async (_parent, args, ctx) => {
  const result = await ctx.injector.get(OIDCIntegrationsProvider).requestDomainChallenge({
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
      oidcIntegrationDomain: result.domain,
    },
  };
};
