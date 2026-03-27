import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCheck: NonNullable<MutationResolvers['schemaCheck']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(SchemaPublisher).check({
    ...input,
    service: input.service?.toLowerCase(),
    target: input.target ?? null,
    schemaProposalId: input.schemaProposalId, // @todo check permission
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
