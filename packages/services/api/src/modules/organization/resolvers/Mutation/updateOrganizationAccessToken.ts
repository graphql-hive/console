import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOrganizationAccessToken: NonNullable<
  MutationResolvers['updateOrganizationAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).update({
    organizationAccessTokenId: args.input.organizationAccessTokenId,
    data: {
      title: args.input.title ?? null,
      description: args.input.description ?? null,
      permissions: [...(args.input.permissions ?? [])],
      assignedResources: args.input.resources ?? null,
    },
  });

  if (result.type === 'success') {
    return {
      ok: {
        __typename: 'UpdateOrganizationAccessTokenResultOk',
        updatedOrganizationAccessToken: result.organizationAccessToken,
      },
    };
  }

  return {
    error: {
      __typename: 'UpdateOrganizationAccessTokenResultError',
      message: result.message,
      details: result.details,
    },
  };
};
