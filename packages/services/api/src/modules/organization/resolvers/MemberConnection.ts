import type { MemberConnectionResolvers, ResolversTypes } from '../../../__generated__/types';
import { createConnection } from '../../../shared/schema';

const connection = createConnection<ResolversTypes['Member']>();

export const MemberConnection: MemberConnectionResolvers = {
  nodes: connection.nodes,
  total: connection.total,
  edges: async (_parent, _arg, _ctx) => {
    /* MemberConnection.edges resolver is required because MemberConnection.edges exists but MemberConnectionMapper.edges does not */
  },
  pageInfo: async (_parent, _arg, _ctx) => {
    /* MemberConnection.pageInfo resolver is required because MemberConnection.pageInfo exists but MemberConnectionMapper.pageInfo does not */
  },
};
