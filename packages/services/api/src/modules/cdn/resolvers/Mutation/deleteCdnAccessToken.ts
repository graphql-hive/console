import { CdnProvider } from '../../providers/cdn.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteCdnAccessToken: NonNullable<MutationResolvers['deleteCdnAccessToken']> = async (
  _,
  { input },
  { injector },
) => {
  const deleteResult = await injector.get(CdnProvider).deleteCDNAccessToken({
    target: input.target,
    cdnAccessTokenId: input.cdnAccessTokenId,
  });

  if (deleteResult.type === 'failure') {
    return {
      error: {
        message: deleteResult.reason,
      },
    };
  }

  return {
    ok: {
      deletedCdnAccessTokenId: input.cdnAccessTokenId,
    },
  };
};
