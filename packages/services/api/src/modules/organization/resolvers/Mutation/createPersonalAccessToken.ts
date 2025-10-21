import { PersonalAccessTokens } from '../../providers/personal-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createPersonalAccessToken: NonNullable<
  MutationResolvers['createPersonalAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(PersonalAccessTokens).create({
    organization: args.input.organization,
    title: args.input.title,
    description: args.input.description ?? null,
    permissions: [...args.input.permissions],
    assignedResources: args.input.resources,
  });

  if (result.type === 'success') {
    return {
      ok: {
        __typename: 'CreatePersonalAccessTokenResultOk',
        createdPersonalAccessToken: result.personalAccessToken,
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
