import { HiveError } from '../../../../shared/errors';
import { SchemaProposalManager } from '../../../proposals/providers/schema-proposal-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCheck: NonNullable<MutationResolvers['schemaCheck']> = async (
  _,
  { input },
  { injector, session },
) => {
  if (typeof input.schemaProposalId === 'string') {
    const selector = await injector
      .get(IdTranslator)
      .resolveTargetReference({ reference: input.target ?? null });

    if (selector?.targetId) {
      await session.assertPerformAction({
        action: 'schemaProposal:modify',
        organizationId: selector.organizationId,
        params: {
          organizationId: selector.organizationId,
          projectId: selector.projectId,
          targetId: selector.targetId,
        },
      });
      const proposal = await injector
        .get(SchemaProposalManager)
        .getProposal({ id: input.schemaProposalId });
      if (proposal?.targetId !== selector?.targetId) {
        throw new HiveError('Proposal not found');
      }
    }
  }

  const result = await injector.get(SchemaPublisher).check({
    ...input,
    service: input.service?.toLowerCase(),
    target: input.target ?? null,
    schemaProposalId: input.schemaProposalId,
  });

  if ('changes' in result) {
    if (result.changes) {
      const proposalId = input.schemaProposalId;
      const schemaProposalChanges =
        result.schemaProposalChanges?.map(c => {
          return {
            ...c,
            schemaProposalChangeDetails:
              typeof proposalId === 'string'
                ? {
                    schemaProposal: {
                      id: proposalId,
                    },
                    implementedBy: null, // when running a check, there's no way that this has already been implemented
                  }
                : null,
          };
        }) ?? null;

      return {
        ...result,
        schemaProposalChanges,
      };
    }
  }

  return result;
};
