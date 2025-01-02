import { createConnection } from '../../../shared/schema';
import type { MemberConnectionResolvers, ResolversTypes } from './../../../__generated__/types';

const connection = createConnection<ResolversTypes['Member']>();

export const MemberConnection: MemberConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
};
