import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createProjectAccessToken: NonNullable<
  MutationResolvers['createProjectAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(OrganizationAccessTokens).createForProject({
    project: args.input.project,
    title: args.input.title,
    description: args.input.description ?? null,
    permissions: [...args.input.permissions],
    assignedResources: args.input.resources,
  });

  if (result.type === 'success') {
    return {
      ok: {
        createdProjectAccessToken: result.accessToken,
        privateAccessKey: result.privateAccessKey,
      },
    };
  }

  return {
    error: {
      message: result.message,
      details: result.details,
    },
  };
};
