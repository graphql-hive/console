import { JobHelpers, Task } from 'graphile-worker';
import { z } from 'zod';
import { Logger } from '@graphql-hive/logger';
import { Context } from './context';

export type TaskDefinition<TName extends string, TModel> = {
  name: TName;
  schema: z.ZodTypeAny & { _output: TModel };
};

export function defineTask<TName extends string, TModel>(
  workflow: TaskDefinition<TName, TModel>,
): TaskDefinition<TName, TModel> {
  return workflow;
}

type TaskImplementationArgs<TPayload> = {
  input: TPayload;
  context: Context;
  logger: Logger;
  helpers: JobHelpers;
};

export type TaskImplementation<TPayload> = (
  args: TaskImplementationArgs<TPayload>,
) => Promise<void>;

export function implementTask<TPayload>(
  taskDefinition: TaskDefinition<string, TPayload>,
  implementation: TaskImplementation<TPayload>,
): (context: Context) => [string, Task] {
  return function (context) {
    return [
      taskDefinition.name,
      function (unsafePayload, helpers) {
        const input = taskDefinition.schema.parse(unsafePayload);
        return implementation({
          input,
          context,
          helpers,
          logger: context.logger.child({
            attrs: {
              'job.id': helpers.job.id,
              'job.queueId': helpers.job.job_queue_id,
              'job.attempts': helpers.job.attempts,
              'job.maxAttempts': helpers.job.max_attempts,
              'job.priority': helpers.job.priority,
              'job.taskId': helpers.job.task_id,
            },
          }),
        });
      },
    ];
  };
}
