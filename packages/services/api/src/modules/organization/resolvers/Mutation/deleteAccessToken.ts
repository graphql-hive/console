import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteAccessToken: NonNullable<MutationResolvers['deleteAccessToken']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(OrganizationAccessTokens).delete({
    accessTokenId: args.input.accessToken.byId,
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
      deletedAccessTokenId: result.organizationAccessTokenId,
    },
  };
};
