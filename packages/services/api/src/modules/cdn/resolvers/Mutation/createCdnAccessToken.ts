import { CdnProvider } from '../../providers/cdn.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createCdnAccessToken: NonNullable<MutationResolvers['createCdnAccessToken']> = async (
  _,
  { input },
  { injector },
) => {
  const cdn = injector.get(CdnProvider);

  const result = await cdn.createCDNAccessToken({
    target: input.target,
    alias: input.alias,
  });

  if (result.type === 'failure') {
    return {
      error: {
        message: result.reason,
      },
    };
  }

  return {
    ok: {
      secretAccessToken: result.secretAccessToken,
      createdCdnAccessToken: result.cdnAccessToken,
      cdnUrl: result.cdnUrl,
    },
  };
};
