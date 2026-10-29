import type { JobHelpers } from 'graphile-worker';
import { z } from 'zod';
import type { Context } from './context.js';
import { defineTask, implementTask, type TaskDefinition } from './kit.js';
import { EvaluateMetricAlertRulesTask } from './tasks/evaluate-metric-alert-rules.js';
import { FlushTargetTokenLastUsedTask } from './tasks/flush-target-token-last-used.js';
import { PurgeExpiredAlertStateLogTask } from './tasks/purge-expired-alert-state-log.js';
import { PurgeExpiredDedupeKeysTask } from './tasks/purge-expired-dedupe-keys.js';
import { PurgeExpiredSchemaChecks } from './tasks/purge-expired-schema-checks.js';
import { PurgeExpiredSchemaRevisions } from './tasks/purge-expired-schema-revisions.js';

const helpers = {
  job: { id: '1', job_queue_id: null, attempts: 1, max_attempts: 25, priority: 0, task_id: 1 },
} as unknown as JobHelpers;
const context = { logger: { child: () => ({}) } } as unknown as Context;

// What graphile-worker enqueues for a crontab line: no `input`, only its own marker.
const cronPayload = { _cron: { ts: '2026-10-29T10:00:00.000Z', backfilled: false } };

describe('implementTask', () => {
  // Every task the crontab in index.ts schedules. A schema that requires `input` makes the
  // task fail validation on every tick without ever running (zod v4 made `z.unknown()` required).
  const cronTasks: Array<TaskDefinition<string, z.ZodType>> = [
    EvaluateMetricAlertRulesTask,
    PurgeExpiredAlertStateLogTask,
    PurgeExpiredDedupeKeysTask,
    PurgeExpiredSchemaChecks,
    PurgeExpiredSchemaRevisions,
    FlushTargetTokenLastUsedTask,
  ];
  test.each(cronTasks)('runs cron task $name on a cron payload', async definition => {
    const inputs: unknown[] = [];
    const [, task] = implementTask(definition, async ({ input }) => {
      inputs.push(input);
    })(context);

    await task(cronPayload, helpers);

    expect(inputs).toEqual([undefined]);
  });

  test('still rejects a cron payload for a task that needs input', () => {
    const [, task] = implementTask(
      defineTask({ name: 'needsInput', schema: z.object({ id: z.string() }) }),
      async () => {},
    )(context);

    // The payload is parsed before the implementation runs, so the throw is synchronous.
    expect(() => task(cronPayload, helpers)).toThrow();
  });
});
