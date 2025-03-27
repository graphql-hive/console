import { createConnection } from '../../../shared/schema';
import type {
  ResolversTypes,
  SchemaErrorConnectionResolvers,
} from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['SchemaError']>();

export const SchemaErrorConnection: SchemaErrorConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
  edges: nodes => {
    return nodes.map(node => ({
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
