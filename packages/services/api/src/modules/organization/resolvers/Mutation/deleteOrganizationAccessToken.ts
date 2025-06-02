import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOrganizationAccessToken: NonNullable<
  MutationResolvers['deleteOrganizationAccessToken']
> = async (_parent, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).delete({
    organizationAccessTokenId: args.input.organizationAccessToken.byId,
  });

  return {
    ok: {
      __typename: 'DeleteOrganizationAccessTokenResultOk',
      deletedOrganizationAccessTokenId: result.organizationAccessTokenId,
    },
  };
};
