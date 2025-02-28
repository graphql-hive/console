import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createOrganizationAccessToken: NonNullable<
  MutationResolvers['createOrganizationAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).create({
    organization: args.input.organization,
    title: args.input.title,
    description: args.input.description ?? null,
    permissions: [...args.input.permissions],
    assignedResources: args.input.resources,
  });

  if (result.type === 'success') {
    return {
      ok: {
        __typename: 'CreateOrganizationAccessTokenResultOk',
        createdOrganizationAccessToken: result.organizationAccessToken,
        privateAccessKey: result.privateAccessKey,
      },
    };
  }

  return {
    error: {
      __typename: 'CreateOrganizationAccessTokenResultError',
      message: result.message,
      details: result.details,
    },
  };
};
