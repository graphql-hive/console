import { SchemaProposalManager } from '../../providers/schema-proposal-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSchemaProposal: NonNullable<MutationResolvers['createSchemaProposal']> = async (
  _,
  { input },
  { injector, session },
) => {
  const { target, title, description, isDraft, initialChecks } = input;
  let user: {
    id: string;
    displayName: string;
  } | null = null;
  try {
    const actor = await session.getActor();
    if (actor.type === 'user') {
      user = {
        id: actor.user.id,
        displayName: actor.user.displayName,
      };
    }
  } catch (e) {
    // ignore
  }

  const result = await injector.get(SchemaProposalManager).proposeSchema({
    target,
    title,
    description: description ?? '',
    isDraft: isDraft ?? false,
    user: user
      ? {
          id: user.id,
          displayName: user.displayName,
        }
      : null,
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
