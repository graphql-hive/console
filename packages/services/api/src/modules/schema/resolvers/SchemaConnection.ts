import { createConnection } from '../../../shared/schema';
import type { ResolversTypes, SchemaConnectionResolvers } from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['Schema']>();

export const SchemaConnection: SchemaConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
  edges: edges => {
    return edges.map(node => ({
      cursor: '',
      node,
    }));
  },
  pageInfo: () => ({
    startCursor: '',
    endCursor: '',
    hasNextPage: false,
    hasPreviousPage: false,
  }),
};
