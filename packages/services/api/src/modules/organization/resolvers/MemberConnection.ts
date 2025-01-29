import type { MemberConnectionResolvers, ResolversTypes } from '../../../__generated__/types';
import { createConnection } from '../../../shared/schema';

const connection = createConnection<ResolversTypes['Member']>();

export const MemberConnection: MemberConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
};
