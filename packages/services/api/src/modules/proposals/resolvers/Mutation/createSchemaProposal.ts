import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposal: NonNullable<MutationResolvers['createSchemaProposal']> = async (
  _,
  { input },
  { injector, session },
) => {
  const { target, title, description, isDraft, initialChecks } = input;
  const user = await session.getViewer();
  const result = await injector.get(SchemaProposalManager).proposeSchema({
    target,
    title,
    description: description ?? '',
    isDraft: isDraft ?? false,
    user: {
      id: user.id,
      displayName: user.displayName,
    },
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
