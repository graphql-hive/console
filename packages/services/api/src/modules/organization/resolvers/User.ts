import type { UserResolvers } from './../../../__generated__/types';

export const User: Pick<UserResolvers, 'provisionInfo'> = {
  provisionInfo: async (user, _arg, _ctx) => {
    if (!user.provisionedByOrganizationId) {
      return null;
    }

    return {
      isDisabled: user.deactivatedAt !== null,
      externalId: user.externalId,
    };
  },
};
