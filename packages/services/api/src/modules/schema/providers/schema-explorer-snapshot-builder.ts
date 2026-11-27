import { Inject, Injectable, Scope } from 'graphql-modules';
import type { z } from 'zod';
import { hasSchemaExplorerSnapshot } from '@hive/schema-explorer-snapshot';
import { metrics } from '@hive/service-common';
import { TaskScheduler } from '@hive/workflows/kit';
import { SchemaExplorerSnapshotBuildTask } from '@hive/workflows/tasks/schema-explorer-snapshot-build';
import * as Sentry from '@sentry/node';
import { HiveError } from '../../../shared/errors';
import { PUB_SUB_CONFIG, type HivePubSub } from '../../shared/providers/pub-sub';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';
import { SchemaExplorerCacheConfig } from './schema-explorer-cache';

/** Backup for a missed pubsub notification: how often to check whether the snapshot is stored. */
const POLL_INTERVAL_MS = 5_000;

const builds = new metrics.Counter({
  name: 'api_schema_explorer_snapshot_builds_total',
  help: 'Schema explorer snapshot builds this instance waited for, by outcome.',
  // ready: stored in Redis; empty: the version has no schema; error: the build failed;
  // timeout: not done within SCHEMA_EXPLORER_SNAPSHOT_BUILD_TIMEOUT_MS.
  labelNames: ['outcome'],
});

export type LegacyComposition = NonNullable<
  z.input<(typeof SchemaExplorerSnapshotBuildTask)['schema']>['legacyComposition']
>;

type Outcome = 'ready' | 'empty';

/**
 * Has the workflows service build schema explorer snapshots (`SchemaExplorerSnapshotBuildTask`),
 * so parsing large schemas never blocks the API, and waits until the snapshot is stored.
 *
 * Concurrent requests from all API instances share one build: the task is deduplicated per
 * schema version, and every waiting request is notified on the `schemaExplorerSnapshot` channel.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class SchemaExplorerSnapshotBuilder {
  private timeoutMs: number;

  constructor(
    private taskScheduler: TaskScheduler,
    @Inject(PUB_SUB_CONFIG) private pubSub: HivePubSub,
    @Inject(REDIS_INSTANCE) private redis: Redis,
    { config }: SchemaExplorerCacheConfig,
  ) {
    this.timeoutMs = config.buildTimeoutMs;
  }

  /**
   * Resolves `true` once the snapshot is stored in Redis, `false` if the version has no schema.
   * `legacyComposition` is required for versions without persisted SDL.
   */
  async build(
    schemaVersionId: string,
    options: { requestId?: string; legacyComposition: LegacyComposition | null },
  ): Promise<boolean> {
    try {
      const outcome = await this.scheduleAndWait(schemaVersionId, options);
      builds.inc({ outcome });
      return outcome === 'ready';
    } catch (error) {
      builds.inc({ outcome: error instanceof BuildTimeoutError ? 'timeout' : 'error' });
      throw error;
    }
  }

  private async scheduleAndWait(
    schemaVersionId: string,
    options: { requestId?: string; legacyComposition: LegacyComposition | null },
  ): Promise<Outcome> {
    const updates = this.pubSub
      .subscribe('schemaExplorerSnapshot', schemaVersionId)
      [Symbol.asyncIterator]();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    try {
      // Listen before scheduling, so the notification of a fast build is not missed.
      const notification = updates.next();

      // Another instance may have stored it since this one looked.
      if (await hasSchemaExplorerSnapshot(this.redis, schemaVersionId)) {
        return 'ready';
      }

      await this.taskScheduler.scheduleTask(
        SchemaExplorerSnapshotBuildTask,
        { schemaVersionId, legacyComposition: options.legacyComposition },
        {
          requestId: options.requestId,
          // Builds in progress are shared: while one is pending, no second one is scheduled.
          dedupe: { key: schemaVersionId, ttl: this.timeoutMs },
        },
      );

      return await new Promise<Outcome>((resolve, reject) => {
        timeout = setTimeout(() => reject(new BuildTimeoutError()), this.timeoutMs);
        poll = setInterval(() => {
          hasSchemaExplorerSnapshot(this.redis, schemaVersionId).then(
            stored => stored && resolve('ready'),
            () => {
              // The notification or the next poll decides.
            },
          );
        }, POLL_INTERVAL_MS);
        notification.then(result => {
          if (result.done) {
            return;
          }
          const { status, reason } = result.value;
          if (status === 'READY') {
            resolve('ready');
          } else if (status === 'EMPTY') {
            resolve('empty');
          } else {
            Sentry.captureMessage('Building a schema explorer snapshot failed', {
              extra: { schemaVersionId, reason },
            });
            reject(new HiveError('Failed to prepare the schema explorer for this schema version.'));
          }
        }, reject);
      });
    } finally {
      clearTimeout(timeout);
      clearInterval(poll);
      await updates.return?.();
    }
  }
}

class BuildTimeoutError extends HiveError {
  constructor() {
    super(
      'The schema explorer for this schema version is still being prepared. Please try again in a moment.',
    );
  }
}
