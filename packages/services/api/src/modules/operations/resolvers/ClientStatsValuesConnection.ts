import { createConnection } from '../../../shared/schema';
import type {
  ClientStatsValuesConnectionResolvers,
  ResolversTypes,
} from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['ClientStatsValues']>();

export const ClientStatsValuesConnection: ClientStatsValuesConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
};
