import { HiveError } from '../../../shared/errors';
import { SchemaManager } from '../../schema/providers/schema-manager';
import { IdTranslator } from '../../shared/providers/id-translator';
import { SchemaProposalManager } from '../providers/schema-proposal-manager';
import type { SchemaProposalChangeDetailsResolvers } from './../../../__generated__/types';

export const SchemaProposalChangeDetails: SchemaProposalChangeDetailsResolvers = {
  /* Implement SchemaProposalChangeDetails resolver logic here */
  implementedBy: async (parent, _, { injector }) => {
    const versionId = parent?.implementedBy?.id;
    if (!versionId) {
      return null;
    }
    const schemaProposalId = parent.schemaProposal.id;
    const proposal = await injector
      .get(SchemaProposalManager)
      .getProposal({ id: schemaProposalId });

    if (!proposal) {
      throw new Error('Something went wrong!');
    }
    const ref = await injector
      .get(IdTranslator)
      .resolveTargetReference({ reference: { byId: proposal.targetId } });
    if (!ref) {
      throw new HiveError('Target not found');
    }
    // @todo consider passing in these values to avoid the lookup
    // const { organizationId, projectId, targetId } = parent.selector;

    const version = await injector.get(SchemaManager).getSchemaVersion({
      versionId,
      organizationId: ref.organizationId,
      projectId: ref.projectId,
      targetId: ref.targetId,
    });

    return version;
  },
  schemaProposal: async (parent, _arg, { injector }) => {
    if (!parent) {
      throw new Error('Uh oh');
    }
    const schemaProposalId = parent.schemaProposal.id;

    const proposal = await injector
      .get(SchemaProposalManager)
      .getProposal({ id: schemaProposalId });

    if (!proposal) {
      throw new Error('Something went wrong!');
    }
    return proposal;
  },
};
