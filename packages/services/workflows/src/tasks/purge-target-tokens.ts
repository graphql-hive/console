import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';

const targetTokenCachePrefix = 'bentocache:target-tokens';

export const PurgeTargetTokensTask = defineTask({
  name: 'purgeTargetTokens',
  schema: z.object({
    tokens: z.array(z.string()),
  }),
});

export const task = implementTask(PurgeTargetTokensTask, async args => {
  const tokens = [...new Set(args.input.tokens)];
  if (tokens.length === 0) {
    return;
  }

  const pipeline = args.context.redis.pipeline();
  for (const token of tokens) {
    pipeline.unlink(`${targetTokenCachePrefix}:${token}`);
  }

  const results = await pipeline.exec();
  if (results === null) {
    throw new Error('Target token L2 cache purge pipeline was not executed.');
  }

  const errors = results.flatMap(([error]) => (error ? [error] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to purge target tokens from the L2 cache.');
  }

  args.logger.debug({ purgedCount: tokens.length }, 'purged target tokens from the L2 cache');
});
