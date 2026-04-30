import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';

/**
 * Runs a check to determine if the changes done in a specific schema version
 * correspond to any of the target's approved schema proposals. If they match,
 * then this inserts a record to track the implementation.
 */
export const SchemaProposalImplementationTask = defineTask({
  name: 'schemaProposalImplementation',
  schema: z.object({
    targetId: z.string(),
    schemaVersionId: z.string(),
  }),
});

export const task = implementTask(SchemaProposalImplementationTask, async args => {
  const pool = args.context.pg;

  try {
    const implementedChanges = await args.context.schema.schemaVersionChanges({
      pool,
      versionId: args.input.schemaVersionId,
    });

    if (!implementedChanges || implementedChanges.length === 0) {
      args.logger.info(
        'No changes found for schema version. Ignoring. (version=%s, target=%s)',
        args.input.schemaVersionId,
        args.input.targetId,
      );
      return;
    }

    const approvedImplementedChanges =
      await args.context.schema.getEquivalentUnimplementedApprovedChanges(pool, {
        changes: implementedChanges.map(c => ({
          ...c,
          path: c.path ?? undefined,
          criticality: {
            level: c.criticality,
          },
        })),
        targetId: args.input.targetId,
      });

    const implementations = approvedImplementedChanges
      .filter(c => !!c)
      .map(c => ({ id: c.id, schemaVersionId: args.input.schemaVersionId }));

    if (implementations.length) {
      args.logger.info(
        'Transitioning changes to implemented (version=%s, target=%s, count=%d)',
        args.input.schemaVersionId,
        args.input.targetId,
        implementations.length,
      );
      await args.context.schema.implementChanges(pool, implementations);
    } else {
      args.logger.info(
        'No approved changes found matching schema version (version=%s, target=%s)',
        args.input.schemaVersionId,
        args.input.targetId,
      );
    }
  } catch (e: unknown) {
    args.logger.error('Change implementation failed from %s', String(e));
    throw e;
  }
});
