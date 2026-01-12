import { parseCliAuthor } from '../lib/parse-cli-author';
import { SchemaManager } from '../providers/schema-manager';
import type { SchemaChangeApprovalResolvers } from './../../../__generated__/types';

export const SchemaChangeApproval: SchemaChangeApprovalResolvers = {
  approvedBy: (approval, _, { injector }) =>
    approval.userId
      ? injector.get(SchemaManager).getUserForSchemaChangeById({ userId: approval.userId })
      : null,
  cliApprovalMetadata: approval => {
    if (!approval.author) {
      return null;
    }
    const { displayName, email } = parseCliAuthor(approval.author);
    return {
      author: approval.author,
      displayName,
      email,
    } as const;
  },
  approvedAt: approval => approval.date,
};
