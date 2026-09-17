import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { purgeExpiredSchemaRevisions } from '../lib/expired-schema-revisions.js';

export const PurgeExpiredSchemaRevisions = defineTask({
  name: 'purgeExpiredSchemaRevisions',
  schema: z.object({ date: z.string().optional() }).optional(),
});

export const task = implementTask(PurgeExpiredSchemaRevisions, async args => {
  args.logger.debug('purging expired schema revisions and orphaned SDL artifacts');
  const statistics = await purgeExpiredSchemaRevisions({
    pool: args.context.pg,
    expiresAt: args.input?.date ? new Date(args.input.date) : new Date(),
  });
  args.logger.debug(
    { statistics },
    'finished purging expired schema revisions and orphaned SDL artifacts',
  );
});
