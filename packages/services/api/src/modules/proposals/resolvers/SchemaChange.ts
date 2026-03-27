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
    if (!selector.schemaProposalId) {
      // this finds a matching approved change record based on
      // the change hash (because the ID will be different)
      // and returns which schema proposal approved the change
      return proposalManager.getMatchingApprovedProposalChangeDetails({
        targetId: selector.targetId,
        change,
      });
    }
    return proposalManager.getProposalChangeDetails({
      schemaProposalId: selector.schemaProposalId,
      targetId: selector.targetId,
      change,
    });
  },
};
