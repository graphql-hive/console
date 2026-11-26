import { Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import {
  deserializeSchemaChange,
  type SchemaDiffInput,
  type SchemaDiffOutcome,
} from '../lib/schema-diff';
import { SchemaWorkerPool } from './schema-worker-pool';

/** Computes schema changes in the shared schema worker threads (see `SchemaWorkerPool`). */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaDiffScheduler {
  constructor(private pool: SchemaWorkerPool) {}

  @traceFn('SchemaDiffScheduler.diff', {
    initAttributes: input => ({
      'hive.diff.source': input.source,
      'hive.diff.existingSdl.length': input.existingSdl.length,
      'hive.diff.incomingSdl.length': input.incomingSdl.length,
    }),
    resultAttributes: result => ({
      'hive.diff.status': result.status,
      'hive.diff.changes': result.status === 'completed' ? result.changes.length : 0,
    }),
  })
  async diff(input: SchemaDiffInput): Promise<SchemaDiffOutcome> {
    const result = await this.pool.run('diff', input);
    if (result.status === 'skipped') {
      return result;
    }
    return { status: 'completed', changes: result.changes.map(deserializeSchemaChange) };
  }
}
