import { PersonalAccessTokens } from '../../providers/personal-access-tokens';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deletePersonalAccessToken: NonNullable<
  MutationResolvers['deletePersonalAccessToken']
> = async (_, args, { injector }) => {
  const result = await injector.get(PersonalAccessTokens).delete({
    personalAccessTokenId: args.input.personalAccessToken.byId,
  });

  return {
    ok: {
      __typename: 'DeletePersonalAccessTokenResultOk',
      deletedPersonalAccessTokenId: result.personalAccessTokenId,
    },
  };
};
