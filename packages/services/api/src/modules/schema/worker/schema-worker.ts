import type { MessagePort } from 'node:worker_threads';
import { handleWorkerTasks, type WorkerTaskMeta } from '../../shared/lib/worker-task';
import type { SchemaDiffInput } from '../lib/schema-diff';
import { runSchemaDiff, traceSchemaDiff, type SchemaDiffWorkerResult } from './schema-diff-worker';
import {
  buildSchemaExplorerSnapshotBuffer,
  traceSchemaExplorerSnapshotBuild,
  type SchemaExplorerSnapshotInput,
} from './schema-explorer-snapshot-worker';

/** The CPU heavy schema tasks the shared schema worker threads run, by kind. */
export type SchemaWorkerTasks = {
  diff: { input: SchemaDiffInput; result: SchemaDiffWorkerResult };
  /** The encoded snapshot; it arrives on the main thread as a Uint8Array (structured clone). */
  'explorer-snapshot': { input: SchemaExplorerSnapshotInput; result: Uint8Array };
};
export type SchemaWorkerTaskKind = keyof SchemaWorkerTasks;
export type SchemaWorkerTask = {
  [K in SchemaWorkerTaskKind]: { kind: K; input: SchemaWorkerTasks[K]['input'] };
}[SchemaWorkerTaskKind];
export type SchemaWorkerResult = SchemaWorkerTasks[SchemaWorkerTaskKind]['result'];

/** Runs a task on the current thread (a worker thread, or the main thread without workers). */
export async function runSchemaWorkerTask(
  task: SchemaWorkerTask,
  meta?: WorkerTaskMeta,
): Promise<SchemaWorkerResult> {
  switch (task.kind) {
    case 'diff':
      return meta ? await traceSchemaDiff(task.input, meta) : await runSchemaDiff(task.input);
    case 'explorer-snapshot':
      return meta
        ? await traceSchemaExplorerSnapshotBuild(task.input, meta)
        : buildSchemaExplorerSnapshotBuffer(task.input);
  }
}

/** Runs the schema tasks in a worker thread, so large schemas do not block the API's event loop. */
export function createSchemaWorker(port: MessagePort) {
  handleWorkerTasks<SchemaWorkerTask, SchemaWorkerResult>(
    port,
    async (task, meta) => await runSchemaWorkerTask(task, meta),
  );
}
