/**
 * Runs schema composition as a job and then notifies the server when completed.
 *
 * There's a delay between when this is added and when it's ran on the off chance
 * that more requests come in requesting composition for the proposal
 */

import { z } from 'zod';
// @todo
import { createSchemaObject } from '@hive/api/shared/entities.js';
import { defineTask, implementTask } from '../kit.js';

export const SchemaProposalCompositionTask = defineTask({
  name: 'schemaProposalComposition',
  schema: z.object({
    proposalId: z.string(),
    targetId: z.string(),
    externalComposition: z.object({
      enabled: z.boolean(),
      endpoint: z.optional(z.string()),
      encryptedSecret: z.optional(z.string()),
    }),
    native: z.boolean(),
  }),
});

export const task = implementTask(SchemaProposalCompositionTask, async args => {
  const schemas = await args.context.schema.proposedSchemas({
    pool: args.context.pg,
    proposalId: args.input.proposalId,
    targetId: args.input.targetId,
  });

  const result = await args.context.schema.composeAndValidate(
    schemas[0].type as 'federation' | 'single' | 'stitching', // is this right?
    schemas.map(s => createSchemaObject(s)),
    {
      /** Whether external composition should be used (only Federation) */
      external: args.input.externalComposition,
      /** Whether native composition should be used (only Federation) */
      native: args.input.native,
      /** Specified contracts (only Federation) */
      // @todo consider passing contracts...
      contracts: null,
    },
  );
  if (result.errors.length) {
    args.logger.error('Composition error found: --------\n%o', result.errors);
  }
});
