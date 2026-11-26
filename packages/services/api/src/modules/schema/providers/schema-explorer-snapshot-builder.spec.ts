import { createPubSub } from 'graphql-yoga';
import Redis from 'ioredis-mock';
import 'reflect-metadata';
import type { HivePubSub } from '@hive/pubsub';
import {
  buildSchemaExplorerSnapshotBuffer,
  schemaExplorerSnapshotKey,
  writeSchemaExplorerSnapshot,
} from '@hive/schema-explorer-snapshot';
import { metrics } from '@hive/service-common';
import { SchemaExplorerSnapshotBuildTask } from '@hive/workflows/tasks/schema-explorer-snapshot-build';
import { SchemaExplorerCacheConfig } from './schema-explorer-cache';
import { SchemaExplorerSnapshotBuilder } from './schema-explorer-snapshot-builder';

let port = 2000;

const snapshot = buildSchemaExplorerSnapshotBuffer({
  compositeSdl: `type Query { hello: String }`,
  supergraphSdl: null,
});

type Status = 'READY' | 'EMPTY' | 'ERROR';

/**
 * A builder whose task scheduler stands in for the workflows service: `onScheduled` runs instead
 * of the task and may store the snapshot and publish the outcome.
 */
function setup(
  onScheduled: (helpers: {
    store(): Promise<void>;
    publish(status: Status, reason?: string): void;
  }) => void,
  buildTimeoutMs = 5_000,
) {
  const redis = new Redis(port++);
  const pubSub = createPubSub() as unknown as HivePubSub;
  const subscriptionsEnded = vi.fn();
  const subscribe = pubSub.subscribe.bind(pubSub);
  vi.spyOn(pubSub, 'subscribe').mockImplementation(((...args: Parameters<typeof subscribe>) => {
    const iterator = subscribe(...args)[Symbol.asyncIterator]();
    const end = iterator.return?.bind(iterator);
    iterator.return = async value => {
      subscriptionsEnded();
      return end!(value);
    };
    return { [Symbol.asyncIterator]: () => iterator };
  }) as typeof pubSub.subscribe);

  const scheduleTask = vi.fn(
    async (_task: unknown, payload: { schemaVersionId: string }, _options: unknown) => {
      setTimeout(() =>
        onScheduled({
          store: () => writeSchemaExplorerSnapshot(redis, payload.schemaVersionId, snapshot),
          publish: (status, reason) =>
            pubSub.publish('schemaExplorerSnapshot', payload.schemaVersionId, {
              status,
              reason: reason ?? null,
            }),
        }),
      );
    },
  );

  const builder = new SchemaExplorerSnapshotBuilder(
    { scheduleTask } as any,
    pubSub,
    redis as any,
    new SchemaExplorerCacheConfig({ memoryMaxBytes: 1024 ** 2, buildTimeoutMs }),
  );
  return { builder, redis, scheduleTask, subscriptionsEnded };
}

async function builds(outcome: string) {
  const metric = metrics.register.getSingleMetric('api_schema_explorer_snapshot_builds_total');
  const { values } = await metric!.get();
  return values.find(entry => entry.labels.outcome === outcome)?.value ?? 0;
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('schedules the build task once, deduplicated per version, and resolves when it is ready', async () => {
  const { builder, redis, scheduleTask, subscriptionsEnded } = setup(async ({ store, publish }) => {
    await store();
    publish('READY');
  });

  expect(await builder.build('version-1', { requestId: 'req-1', legacyComposition: null })).toBe(
    true,
  );
  expect(await redis.exists(schemaExplorerSnapshotKey('version-1'))).toBe(1);
  expect(scheduleTask).toHaveBeenCalledTimes(1);
  expect(scheduleTask).toHaveBeenCalledWith(
    SchemaExplorerSnapshotBuildTask,
    { schemaVersionId: 'version-1', legacyComposition: null },
    { requestId: 'req-1', dedupe: { key: 'version-1', ttl: 5_000 } },
  );
  expect(subscriptionsEnded).toHaveBeenCalledTimes(1);
});

test('passes the composition settings of versions without persisted SDL', async () => {
  const legacyComposition = {
    externalComposition: {
      enabled: true,
      endpoint: 'https://compose.example',
      encryptedSecret: 'x',
    },
    native: false,
  };
  const { builder, scheduleTask } = setup(({ publish }) => publish('EMPTY'));

  await builder.build('version-1', { legacyComposition });

  expect(scheduleTask.mock.calls[0][1]).toEqual({
    schemaVersionId: 'version-1',
    legacyComposition,
  });
});

test('does not schedule a build when the snapshot is already stored', async () => {
  const { builder, redis, scheduleTask } = setup(() => {});
  await writeSchemaExplorerSnapshot(redis, 'version-1', snapshot);

  expect(await builder.build('version-1', { legacyComposition: null })).toBe(true);
  expect(scheduleTask).not.toHaveBeenCalled();
});

test('notices a stored snapshot without a notification', async () => {
  // The notification got lost: only polling Redis finds the snapshot.
  const { builder } = setup(({ store }) => store());

  expect(await builder.build('version-1', { legacyComposition: null })).toBe(true);
});

test('resolves false for a version without a schema', async () => {
  const { builder } = setup(({ publish }) => publish('EMPTY'));
  const before = await builds('empty');

  expect(await builder.build('version-1', { legacyComposition: null })).toBe(false);
  expect((await builds('empty')) - before).toBe(1);
});

test('a failed build fails the request', async () => {
  const { builder, subscriptionsEnded } = setup(({ publish }) =>
    publish('ERROR', 'Syntax Error: Unexpected Name'),
  );
  const before = await builds('error');

  await expect(builder.build('version-1', { legacyComposition: null })).rejects.toThrow(
    'Failed to prepare the schema explorer',
  );
  expect((await builds('error')) - before).toBe(1);
  expect(subscriptionsEnded).toHaveBeenCalledTimes(1);
});

test('gives up after the timeout and ends the subscription', async () => {
  const { builder, subscriptionsEnded } = setup(() => {}, 100);
  const before = await builds('timeout');

  await expect(builder.build('version-1', { legacyComposition: null })).rejects.toThrow(
    'still being prepared',
  );
  expect((await builds('timeout')) - before).toBe(1);
  expect(subscriptionsEnded).toHaveBeenCalledTimes(1);
});
