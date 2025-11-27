import type { OpenWorkflow } from 'openworkflow';
import type {
  WorkflowDefinitionConfig as InternalWorkflowDefinitionConfig,
  StepFunctionConfig,
  WorkflowDefinition,
  WorkflowRunHandle,
} from 'openworkflow/dist/client';
import { DurationString } from 'openworkflow/dist/duration.js';
import type { ZodType } from 'zod';
import type { Context } from './context.js';

type WorkflowDefinitionConfig<$Schema = unknown> = InternalWorkflowDefinitionConfig & {
  schema: ZodType<$Schema>;
};

export function declareWorkflow<$Schema = unknown>(args: WorkflowDefinitionConfig<$Schema>) {
  return args;
}

type StepFunction<Output> = () => Promise<Output | undefined> | Output | undefined;

interface WorkflowFunctionParams<Input> {
  input: Input;
  step: StepApi;
  version: string | null;
}

interface StepApi {
  run<Output>(config: StepFunctionConfig, fn: StepFunction<Output>): Promise<Output>;
  sleep(name: string, duration: DurationString): Promise<void>;
}

// Task Logging Todos: unique task ID
// Inject logger instance with all necessary prefixes (step; etc.)

/**
 * Implement a workflow.
 */
export function workflow<$Schema = unknown>(
  config: WorkflowDefinitionConfig<$Schema>,
  implementation: (
    args: WorkflowFunctionParams<$Schema> & { context: Context },
  ) => Promise<unknown>,
) {
  return (ow: OpenWorkflow, context: Context) =>
    ow.defineWorkflow<$Schema, unknown>(config, args => {
      return implementation({ ...args, context });
    });
}

async function noop() {}

const scheduleWorkflowCache = new Map<string, WorkflowDefinition<unknown, unknown>['run']>();

/**
 * Schedule a workflow run from application code.
 */
export function scheduleWorkflow<$Schema>(
  ow: OpenWorkflow,
  config: WorkflowDefinitionConfig<$Schema>,
  input: $Schema,
): Promise<WorkflowRunHandle<unknown>> {
  let run = scheduleWorkflowCache.get(config.name);
  if (!run) {
    const definition = ow.defineWorkflow(config, noop);
    run = input => definition.run(config.schema.parse(input));
    scheduleWorkflowCache.set(config.name, run);
  }

  return run(input);
}
