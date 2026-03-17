import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createPersonalAccessToken: NonNullable<
  MutationResolvers['createPersonalAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).createPersonalAccessTokenForViewer({
    organization: args.input.organization,
    title: args.input.title,
    description: args.input.description ?? null,
    permissions: args.input.permissions ?? null,
    assignedResources: args.input.resources ?? null,
  });

  if (result.type === 'success') {
    return {
      ok: {
        __typename: 'CreatePersonalAccessTokenResultOk',
        createdPersonalAccessToken: result.accessToken,
        privateAccessKey: result.privateAccessKey,
      },
    };
  }

  return {
    error: {
      __typename: 'CreatePersonalAccessTokenResultError',
      message: result.message,
      details: result.details,
    },
  };
};
