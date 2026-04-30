import { SchemaProposalManager } from '../../proposals/providers/schema-proposal-manager';
import type { SchemaChangeResolvers } from './../../../__generated__/types';

export function toTitleCase(str: string) {
  return str.toLowerCase().replace(/^_*(.)|_+(.)/g, (_, c: string, d: string) => {
    return (c ?? d).toUpperCase();
  });
}

export const SchemaChange: Pick<SchemaChangeResolvers, 'meta' | 'schemaProposalChangeDetails'> = {
  meta: ({ meta, type }, _arg, _ctx) => {
    // no need to validate because this is done when fetched from the database
    // and the schema should match the db structure, making a check here redundant
    return {
      __typename: toTitleCase(type),
      ...(meta as any),
    };
  },
  schemaProposalChangeDetails: async (change, _, { injector }) => {
    const { selector } = change;
    // used for schema changes that proposals don't support. I.e. on contracts
    if (!selector) {
      return null;
    }

    const proposalManager = injector.get(SchemaProposalManager);
    /**
     * If the change belongs to a schema proposal, then fetch the changes just
     * for that proposal
     */
    if (selector.schemaProposalId) {
      return proposalManager.getProposalChangeDetails({
        targetId: selector.targetId,
        schemaProposalId: selector.schemaProposalId,
        change,
      });
    }

    /** If this change is for a pushed schema (in history) */
    if (selector.schemaVersionId) {
      return proposalManager.getImplementedVersionsBySchemaVersionId({
        targetId: selector.targetId,
        schemaVersionId: selector.schemaVersionId,
        change,
      });
    }

    // this finds a matching approved change record based on
    // the change hash (because the ID will be different)
    // and returns which schema proposal approved the change
    return proposalManager.getMatchingApprovedProposalChangeDetails({
      targetId: selector.targetId,
      change,
    });
  },
};
