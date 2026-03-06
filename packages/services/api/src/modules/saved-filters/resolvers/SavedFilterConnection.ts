import type { SavedFilterConnectionResolvers } from './../../../__generated__/types';

export const SavedFilterConnection: SavedFilterConnectionResolvers = {
  edges: connection => connection.edges,
  pageInfo: connection => connection.pageInfo,
};
