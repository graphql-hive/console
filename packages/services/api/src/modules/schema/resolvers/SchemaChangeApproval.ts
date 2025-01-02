import { SchemaManager } from '../providers/schema-manager';
import type { SchemaChangeApprovalResolvers } from './../../../__generated__/types';

export const SchemaChangeApproval: SchemaChangeApprovalResolvers = {
  approvedBy: (approval, _, { injector }) =>
    injector.get(SchemaManager).getUserForSchemaChangeById({ userId: approval.userId }),
  approvedAt: approval => approval.date,
};
