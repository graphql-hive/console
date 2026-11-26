import { Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import type { SchemaExplorerSnapshotInput } from '../worker/schema-explorer-snapshot-worker';
import { SchemaWorkerPool } from './schema-worker-pool';

/**
 * Builds schema explorer snapshots in the shared schema worker threads (see `SchemaWorkerPool`),
 * so parsing and walking large schemas does not block the event loop.
 * Only the encoded snapshot is sent back to the main thread.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaExplorerSnapshotBuilder {
  constructor(private pool: SchemaWorkerPool) {}

  @traceFn('SchemaExplorerSnapshotBuilder.build', {
    initAttributes: input => ({
      'hive.explorer.compositeSdl.length': input.compositeSdl.length,
      'hive.explorer.supergraphSdl.length': input.supergraphSdl?.length ?? 0,
    }),
    resultAttributes: result => ({
      'hive.explorer.snapshot.bytes': result.length,
    }),
  })
  async build(input: SchemaExplorerSnapshotInput): Promise<Buffer> {
    const bytes = await this.pool.run('explorer-snapshot', input);
    return Buffer.isBuffer(bytes)
      ? bytes
      : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
}
