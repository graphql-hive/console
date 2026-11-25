import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import { WorkerPool } from '../../shared/lib/worker-pool';
import { Logger } from '../../shared/providers/logger';
import {
  computeSchemaChanges,
  deserializeSchemaChange,
  type SchemaDiffInput,
  type SchemaDiffOutcome,
} from '../lib/schema-diff';
import type { SchemaDiffWorkerResult } from '../worker/schema-diff-worker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

@Injectable()
export class SchemaDiffWorkerConfig {
  constructor(
    public readonly config: {
      /** `0` diffs on the main thread (e.g. for tests). */
      workerCount: number;
      maxOldGenerationSizeMb: number;
      timeoutMs: number;
    },
  ) {}
}

/** Computes schema changes in worker threads, so large schemas do not block the event loop. */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaDiffScheduler {
  private pool: WorkerPool<SchemaDiffInput, SchemaDiffWorkerResult> | null;

  constructor(logger: Logger, { config }: SchemaDiffWorkerConfig) {
    this.pool =
      config.workerCount > 0
        ? new WorkerPool({
            name: 'schema-diff',
            // Built next to the server bundle (see `packages/services/server/package.json`).
            scriptPath: path.join(__dirname, 'schema-diff-worker.js'),
            size: config.workerCount,
            maxOldGenerationSizeMb: config.maxOldGenerationSizeMb,
            timeoutMs: config.timeoutMs,
            logger,
          })
        : null;
  }

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
    if (!this.pool) {
      return computeSchemaChanges(input);
    }

    const result = await this.pool.run(input);
    if (result.status === 'skipped') {
      return result;
    }
    return { status: 'completed', changes: result.changes.map(deserializeSchemaChange) };
  }

  close() {
    return this.pool?.close();
  }
}
