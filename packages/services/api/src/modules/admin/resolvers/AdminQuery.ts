import type { AdminQueryResolvers } from './../../../__generated__/types';

export const AdminQuery: AdminQueryResolvers = {
  stats: (_, { period, resolution }) => {
    return {
      period,
      resolution,
    };
  },
};
