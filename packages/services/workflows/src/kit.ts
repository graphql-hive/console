import { makeWorkerUtils, WorkerUtils, type JobHelpers, type Task } from 'graphile-worker';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import type { Context } from './context';

export type TaskDefinition<TName extends string, TModel> = {
  name: TName;
  schema: z.ZodTypeAny & { _output: TModel };
};

type TaskImplementationArgs<TPayload> = {
  input: TPayload;
  context: Context;
  logger: Logger;
  helpers: JobHelpers;
};

export type TaskImplementation<TPayload> = (
  args: TaskImplementationArgs<TPayload>,
) => Promise<void>;

/**
 * Define a task
 */
export function defineTask<TName extends string, TModel>(
  workflow: TaskDefinition<TName, TModel>,
): TaskDefinition<TName, TModel> {
  return workflow;
}

/**
 * Implement a task.
 */
export function implementTask<TPayload>(
  taskDefinition: TaskDefinition<string, TPayload>,
  implementation: TaskImplementation<TPayload>,
): (context: Context) => [string, Task] {
  const schema = z.object({
    requestId: z.string().optional(),
    input: taskDefinition.schema,
  });

  return function (context) {
    return [
      taskDefinition.name,
      function (unsafePayload, helpers) {
        const payload = schema.parse(unsafePayload);
        return implementation({
          input: payload.input,
          context,
          helpers,
          logger: context.logger.child({
            'request.id': payload.requestId,
            'job.id': helpers.job.id,
            'job.queueId': helpers.job.job_queue_id,
            'job.attempts': helpers.job.attempts,
            'job.maxAttempts': helpers.job.max_attempts,
            'job.priority': helpers.job.priority,
            'job.taskId': helpers.job.task_id,
          }),
        });
      },
    ];
  };
}

/**
 * Schedule a tasks.
 */
export class TaskScheduler {
  tools: Promise<WorkerUtils>;
  constructor(pgPool: Pool) {
    this.tools = makeWorkerUtils({
      pgPool,
    });
  }

  async scheduleTask<TPayload>(
    taskDefinition: TaskDefinition<string, TPayload>,
    payload: TPayload,
    opts?: {
      requestId?: string;
    },
  ) {
    await (
      await this.tools
    ).addJob(taskDefinition.name, {
      requestId: opts?.requestId,
      input: taskDefinition.schema.parse(payload),
    });
  }

  async dispose() {
    await (await this.tools).release();
  }
}
