import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { flushTargetTokenLastUsed } from '../lib/target-token-last-used.js';

export const FlushTargetTokenLastUsedTask = defineTask({
  name: 'flushTargetTokenLastUsed',
  schema: z.number().optional(),
});

export const task = implementTask(FlushTargetTokenLastUsedTask, async args => {
  const date = typeof args.input === 'number' ? new Date(args.input * 1_000) : new Date();
  const result = await flushTargetTokenLastUsed({
    redis: args.context.redis,
    pg: args.context.pg,
    now: date,
  });

  args.logger.debug({ ...result, date }, 'flushed target token last-used dates');
});
