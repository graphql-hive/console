import { JobHelpers, quickAddJob, Task } from 'graphile-worker';
import { Client as PGClient, Pool } from 'pg';
import { z } from 'zod';
import { Logger } from '@graphql-hive/logger';
import { Context } from './context.js';

export type WorkflowDefinition<TName extends string, TModel> = {
  name: TName;
  schema: z.ZodTypeAny & { _output: TModel };
};

export function defineWorkflow<TName extends string, TModel>(
  workflow: WorkflowDefinition<TName, TModel>,
): WorkflowDefinition<TName, TModel> {
  return workflow;
}

type StepFunctionArgs<TOutputModel = any> = {
  id: string;
  output: z.ZodTypeAny & { _output: TOutputModel };
};

type WorkflowImplementationArgs<TPayload> = {
  input: TPayload;
  context: Context;
  logger: Logger;
  helpers: JobHelpers;
  steps: {
    run: <T>(args: StepFunctionArgs<T>, implementation: () => Promise<T>) => Promise<T>;
    sleep: (id: string, amount: number) => Promise<void>;
  };
};

class EnqueuedNextStep extends Error {}

class ParallelTaskEnqueue extends Error {
  stepIds: Array<string>;
  constructor(stepId: Array<string>) {
    super();
    this.stepIds = stepId;
  }
}

export function implementWorkflow<TPayload>(
  workflowDefinition: WorkflowDefinition<string, TPayload>,
  implementation: (args: WorkflowImplementationArgs<TPayload>) => Promise<void>,
): (context: Context) => [string, Task] {
  const schema = z.object({
    workflowId: z.string(),
    input: workflowDefinition.schema,
  });

  return function (context) {
    return [
      workflowDefinition.name,
      async function (unsafePayload, helpers) {
        const input = schema.parse(unsafePayload);
        const steps = await helpers.withPgClient(pg =>
          getWorkflowStatus(pg as any, input.workflowId),
        );

        const logger = context.logger.child({
          'workflow.id': input.workflowId,
          'workflow.name': workflowDefinition.name,
          'job.id': helpers.job.id,
          'job.queueId': helpers.job.job_queue_id,
          'job.attempts': helpers.job.attempts,
          'job.maxAttempts': helpers.job.max_attempts,
          'job.priority': helpers.job.priority,
          'job.taskId': helpers.job.task_id,
        });

        // Detection on whether we are running steps in parallel!
        const pendingSteps: Array<{
          stepId: string;
          promise: PromiseWithResolvers<any>;
        }> = [];
        
        let isFlush = false
        
        async function doFlush() {
          const needsSchedule = 
        }

        async function run(
          args: StepFunctionArgs,
          implementation: () => Promise<any>,
        ): Promise<any> {
          const promise = Promise.withResolvers<any>();

          pendingSteps.push({
            stepId: args.id,
            promise,
          });
          
          if (!isFlush) {
            isFlush = true
            Promise.resolve().then(doFlush)
          }

          return await promise.promise;

          if (!step) {
          }

          // check if step result already exists
          if (args.id in steps) {
            const stepPayload = steps[args.id].output;

            const parseResult = args.output.safeParse(stepPayload);

            if (parseResult.success) {
              return parseResult.data;
            }

            // special handling for void, since the key is omitted...
            if (stepPayload === null) {
              return;
            }

            // TODO: handle inconsistency case!
          }

          pendingSteps.push(args.id);

          // delay to next tick to gather parallel steps
          await Promise.resolve();

          // We only have one task? Let's run it!
          if (pendingSteps.length === 1) {
            if (logger.attrs) {
              logger.attrs['workflow.step'] = args.id;
            }

            const result = await implementation();

            await helpers.withPgClient(client =>
              updateWorkflowStatus(client as any, input.workflowId, args.id, {
                status: 'complete',
                output: result ?? null,
              }),
            );

            // add job for next steps!
            await helpers.addJob(workflowDefinition.name, input);

            throw new EnqueuedNextStep();
          }

          if (!input.step) {
            if (pendingSteps[0] === args.id) {
              throw new ParallelTaskEnqueue(pendingSteps);
            }

            // make sure other promises don't resolve...
            // there should probably a better way...
            return new Promise<never>(() => {});
          }

          // Multiple tasks are a headache!

          if (input.step && input.step.id === args.id) {
            if (logger.attrs) {
              logger.attrs['workflow.step'] = args.id;
            }
            const result = await implementation();

            // DO stufff
          } else if (pendingSteps[0] === args.id) {
            throw new ParallelTaskEnqueue(pendingSteps);
          }

          // What to do here ??????
        }

        async function sleep(name: string, amount: number) {
          const didSleep = input.sleeps[name] ?? false;
          if (didSleep) {
            return;
          }

          const sleepUntil = new Date(new Date().getTime() + amount);

          logger.debug({ sleepUntil }, 'task will go to sleep');

          await helpers.addJob(
            workflowDefinition.name,
            {
              ...input,
              steps: input.steps,
              sleeps: {
                ...input.sleeps,
                [name]: true,
              },
            },
            {
              runAt: sleepUntil,
            },
          );

          throw new EnqueuedNextStep();
        }

        try {
          return await implementation({
            input: input.input,
            steps: {
              run,
              sleep,
            },
            context,
            helpers,
            logger,
          });
        } catch (err) {
          if (err instanceof EnqueuedNextStep) {
            return;
          }

          if (err instanceof ParallelTaskEnqueue) {
            for (const stepId of err.stepIds) {
              await helpers.addJob(
                workflowDefinition.name,
                {
                  ...input,
                  step: {
                    siblings: err.stepIds.filter(id => id !== stepId),
                    id: stepId,
                  },
                } satisfies typeof input,
                {
                  jobKey: `${input.workflowId}//${stepId}`,
                },
              );
            }
          }

          throw err;
        }
      },
    ];
  };
}

export async function queueWorkflow<TPayload>(
  workflowDefinition: WorkflowDefinition<string, TPayload>,
  payload: TPayload,
) {
  const workflowId = crypto.randomUUID();
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
  });
  await createWorkflow(pool, workflowId);
  await pool.end();

  await quickAddJob(
    {
      connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    },
    workflowDefinition.name,
    {
      workflowId,
      input: payload,
      steps: {},
      sleeps: {},
    },
  );
}

// FAQ:

// How can we achieve workflow consistency for named queues?
//
// initial task -> priority: 1
// queued tasks -> priority: + 1
// That way the queued tasks have HIGHER priority than other queued tasks

// TODO: we need an extra table for steps attempts and results

const StepModel = z.object({
  status: z.union([z.literal('err'), z.literal('pending'), z.literal('complete')]),
  output: z.any(),
});

const StepsModel = z.record(z.string(), StepModel);

async function createWorkflow(pg: Pool, workflowId: string) {
  await pg.query(
    `INSERT INTO graphile_worker._private_workflows("workflow_id", "steps") VALUES ($1::uuid, $2::jsonb)`,
    [workflowId, JSON.stringify({})],
  );
}

async function getWorkflowStatus(pg: PGClient, workflowId: string) {
  const { rows } = await pg.query(
    `SELECT "steps" FROM graphile_worker._private_workflows WHERE "workflow_id" = $1::uuid`,
    [workflowId],
  );
  return StepsModel.parse(rows[0].steps);
}

async function updateWorkflowStatus(
  pg: Pool,
  workflowId: string,
  stepName: string,
  payload: z.TypeOf<typeof StepModel>,
) {
  const { rows } = await pg.query(
    `
      INSERT INTO graphile_worker._private_workflows (
        "workflow_id",
        "steps"
      )
      VALUES (
        $1::uuid,
        jsonb_build_object($2, $3::jsonb)
      )
      ON CONFLICT ("workflow_id")
      DO UPDATE SET
        "steps" = jsonb_set(
          graphile_worker._private_workflows."steps",
          ARRAY[$2],
          $3::jsonb,
          true
        )
      RETURNING "steps";
    `,
    [workflowId, stepName, JSON.stringify(payload)],
  );

  return StepsModel.parse(rows[0].steps);
}
