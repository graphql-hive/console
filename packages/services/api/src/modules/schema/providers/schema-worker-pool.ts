import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable, Scope } from 'graphql-modules';
import { WorkerPool } from '../../shared/lib/worker-pool';
import { Logger } from '../../shared/providers/logger';
import {
  runSchemaWorkerTask,
  type SchemaWorkerResult,
  type SchemaWorkerTask,
  type SchemaWorkerTaskKind,
  type SchemaWorkerTasks,
} from '../worker/schema-worker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

@Injectable()
export class SchemaWorkerConfig {
  constructor(
    public readonly config: {
      /** `0` runs the tasks on the main thread (e.g. for tests). */
      workerCount: number;
      maxOldGenerationSizeMb: number;
      timeoutMs: number;
    },
  ) {}
}

/**
 * The worker threads shared by all CPU heavy schema tasks (schema diffs, schema explorer
 * snapshots), so large schemas do not block the event loop. Tasks of all kinds wait in one queue.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaWorkerPool {
  private pool: WorkerPool<SchemaWorkerTask, SchemaWorkerResult> | null;

  constructor(logger: Logger, { config }: SchemaWorkerConfig) {
    this.pool =
      config.workerCount > 0
        ? new WorkerPool({
            name: 'schema',
            // Built next to the server bundle (see `packages/services/server/package.json`).
            scriptPath: path.join(__dirname, 'schema-worker.js'),
            size: config.workerCount,
            maxOldGenerationSizeMb: config.maxOldGenerationSizeMb,
            timeoutMs: config.timeoutMs,
            logger,
          })
        : null;
  }

  async run<TKind extends SchemaWorkerTaskKind>(
    kind: TKind,
    input: SchemaWorkerTasks[TKind]['input'],
  ): Promise<SchemaWorkerTasks[TKind]['result']> {
    const task = { kind, input } as SchemaWorkerTask;
    const result = this.pool ? await this.pool.run(task) : await runSchemaWorkerTask(task);
    return result as SchemaWorkerTasks[TKind]['result'];
  }

  close() {
    return this.pool?.close();
  }
}
