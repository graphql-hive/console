/**
 * When a schema proposal is approved, then all changes for all checks associated
 * that proposal must be added to the approved changes list. This is to allow
 * future checks/publishes/etc to validate their change against this approved list.
 *
 * This job listens for a schema proposal approval, loops over all the latest
 * checks for that proposal, and inserts those change records into the approved list table.
 */

import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';

export const SchemaProposalApprovalTask = defineTask({
  name: 'schemaProposalApproval',
  schema: z.object({
    proposalId: z.string(),
    targetId: z.string(),
  }),
});

export const task = implementTask(SchemaProposalApprovalTask, async args => {
  const pool = args.context.pg;
  try {
    // collect all changes
    const changes: Parameters<typeof args.context.schema.approveChanges>[1] = [];
    await args.context.schema.forEachProposalCheck(
      {
        pool,
        proposalId: args.input.proposalId,
        targetId: args.input.targetId,
      },
      async check => {
        const checkChanges = check.schemaProposalChanges.map(change => ({
          change,
          proposalId: args.input.proposalId,
          service: check.serviceName ?? undefined,
          targetId: args.input.targetId,
        }));
        changes.push(...checkChanges);
      },
    );

    args.logger.info(
      'Approving changes (count=%d, proposal=%s)',
      changes.length,
      args.input.proposalId,
    );
    // Approve all changes in a single call. If this becomes a bottleneck, then
    // implement snapshots to allow inserting in chunks
    await args.context.schema.approveChanges(pool, changes);
  } catch (e: unknown) {
    args.logger.error('Proposal approval failed from %s', String(e));
    throw e;
  }
});
