import { createConnection } from '../../../shared/schema';
import type {
  ResolversTypes,
  SchemaChangeConnectionResolvers,
} from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['SchemaChange']>();

export const SchemaChangeConnection: SchemaChangeConnectionResolvers = {
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
