import type { MessagePort } from 'node:worker_threads';
import { handleWorkerTasks } from '../../shared/lib/worker-task';
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

/** Diffs schemas in a worker thread, so large schemas do not block the event loop of the API. */
export function createSchemaDiffWorker(port: MessagePort) {
  handleWorkerTasks<SchemaDiffInput, SchemaDiffWorkerResult>(port, runSchemaDiff);
}

export async function runSchemaDiff(input: SchemaDiffInput): Promise<SchemaDiffWorkerResult> {
  const outcome = await computeSchemaChanges(input);
  if (outcome.status === 'skipped') {
    return outcome;
  }
  return { status: 'completed', changes: outcome.changes.map(serializeSchemaChange) };
}
