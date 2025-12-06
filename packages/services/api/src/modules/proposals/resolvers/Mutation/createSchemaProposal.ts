import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposal: NonNullable<MutationResolvers['createSchemaProposal']> = async (
  _,
  { input },
  { injector },
) => {
  const { target, title, description, isDraft, initialChecks, author } = input;

  const result = await injector.get(SchemaProposalManager).proposeSchema({
    target,
    title,
    description: description ?? '',
    isDraft: isDraft ?? false,
    author,
    initialChecks,
  });

  if (result.type === 'error') {
    return {
      error: {
        message: result.error.message,
        details: result.error.details,
      },
      ok: null,
    };
  }

  return {
    error: null,
    ok: {
      schemaProposal: result.schemaProposal,
    },
  };
};
