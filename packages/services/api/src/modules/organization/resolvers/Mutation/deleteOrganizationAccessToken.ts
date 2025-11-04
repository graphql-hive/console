import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOrganizationAccessToken: NonNullable<
  MutationResolvers['deleteOrganizationAccessToken']
> = async (_parent, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).delete({
    accessTokenId: args.input.organizationAccessToken.byId,
    onlyOrganizationScoped: true,
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
      deletedOrganizationAccessTokenId: result.organizationAccessTokenId,
    },
  };
};
