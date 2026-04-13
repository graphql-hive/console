import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';

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

    if (!implementedChanges) {
      args.logger.info(
        'No changes found for schema version (version=%s, target=%s)',
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
