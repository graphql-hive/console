import { threadId, threadName, type MessagePort } from 'node:worker_threads';
import { traceInline } from '@hive/service-common';
import { handleWorkerTasks, type WorkerTaskMeta } from '../../shared/lib/worker-task';
import {
  computeSchemaChanges,
  serializeSchemaChange,
  type SchemaDiffInput,
  type SerializedSchemaChange,
} from '../lib/schema-diff';

/** The changes lose their computed properties when posted to the main thread. */
export type SchemaDiffWorkerResult =
  | { status: 'skipped' }
  | { status: 'completed'; changes: SerializedSchemaChange[] };

const traceSchemaDiff = traceInline<
  [SchemaDiffInput, WorkerTaskMeta],
  Promise<SchemaDiffWorkerResult>
>(
  'SchemaDiffWorker.diff',
  {
    initAttributes: (input, meta) => ({
      'request.id': meta.requestId ?? '',
      'hive.worker.message.id': meta.id,
      'thread.id': threadId,
      'thread.name': threadName ?? '',
      'hive.worker.queue_delay_ms': Date.now() - meta.enqueuedAt,
      'hive.diff.source': input.source,
      'hive.diff.existingSdl.length': input.existingSdl.length,
      'hive.diff.incomingSdl.length': input.incomingSdl.length,
    }),
    resultAttributes: result => ({
      'hive.diff.status': result.status,
      'hive.diff.changes': result.status === 'completed' ? result.changes.length : 0,
    }),
  },
  input => runSchemaDiff(input),
);

/** Diffs schemas in a worker thread, so large schemas do not block the event loop of the API. */
export function createSchemaDiffWorker(port: MessagePort) {
  handleWorkerTasks<SchemaDiffInput, SchemaDiffWorkerResult>(
    port,
    async (input, meta) => await traceSchemaDiff(input, meta),
  );
}

export async function runSchemaDiff(input: SchemaDiffInput): Promise<SchemaDiffWorkerResult> {
  const outcome = await computeSchemaChanges(input);
  if (outcome.status === 'skipped') {
    return outcome;
  }
  return { status: 'completed', changes: outcome.changes.map(serializeSchemaChange) };
}
