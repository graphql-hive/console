import { createConnection } from '../../../shared/schema';
import type {
  ResolversTypes,
  SchemaErrorConnectionResolvers,
} from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['SchemaError']>();

export const SchemaErrorConnection: SchemaErrorConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
};
