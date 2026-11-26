import { threadId, threadName } from 'node:worker_threads';
import { traceInline } from '@hive/service-common';
import { parseGraphQLSource } from '../../../shared/schema';
import type { WorkerTaskMeta } from '../../shared/lib/worker-task';
import { encodeSchemaExplorerSnapshot } from '../lib/schema-explorer-flat-snapshot';
import { buildSchemaExplorerSnapshot } from '../lib/schema-explorer-snapshot';

export type SchemaExplorerSnapshotInput = {
  /** The public (composite) schema of the schema version. */
  compositeSdl: string;
  /** The supergraph of a federated schema version, for subgraph ownership. */
  supergraphSdl: string | null;
};

/**
 * Parses the schemas, builds the explorer snapshot and encodes it.
 * CPU heavy for large schemas (seconds for a 20 MB supergraph), so it runs in a worker thread.
 */
export function buildSchemaExplorerSnapshotBuffer(input: SchemaExplorerSnapshotInput): Buffer {
  const schemaAst = parseGraphQLSource(input.compositeSdl, 'SchemaExplorerSnapshot: Composite');
  const supergraphAst = input.supergraphSdl
    ? parseGraphQLSource(input.supergraphSdl, 'SchemaExplorerSnapshot: Supergraph')
    : null;
  return encodeSchemaExplorerSnapshot(buildSchemaExplorerSnapshot(schemaAst, supergraphAst));
}

/** Builds a snapshot within a worker task (see `schema-worker.ts`). */
export const traceSchemaExplorerSnapshotBuild = traceInline<
  [SchemaExplorerSnapshotInput, WorkerTaskMeta],
  Promise<Buffer>
>(
  'SchemaExplorerSnapshotWorker.build',
  {
    initAttributes: (input, meta) => ({
      'request.id': meta.requestId ?? '',
      'hive.worker.message.id': meta.id,
      'thread.id': threadId,
      'thread.name': threadName ?? '',
      'hive.worker.queue_delay_ms': Date.now() - meta.enqueuedAt,
      'hive.explorer.compositeSdl.length': input.compositeSdl.length,
      'hive.explorer.supergraphSdl.length': input.supergraphSdl?.length ?? 0,
    }),
    resultAttributes: result => ({
      'hive.explorer.snapshot.bytes': result.length,
    }),
  },
  async input => buildSchemaExplorerSnapshotBuffer(input),
);
