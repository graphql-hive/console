import 'reflect-metadata';
import { parse } from 'graphql';
import { composeServices } from '@theguild/federation-composition';
import type { Logger } from '../../shared/providers/logger';
import {
  encodeSchemaExplorerSnapshot,
  SchemaExplorerSnapshotReader,
} from '../lib/schema-explorer-flat-snapshot';
import { buildSchemaExplorerSnapshot } from '../lib/schema-explorer-snapshot';
import { SchemaExplorerSnapshotBuilder } from '../providers/schema-explorer-snapshot-builder';
import { SchemaWorkerConfig, SchemaWorkerPool } from '../providers/schema-worker-pool';
import { buildSchemaExplorerSnapshotBuffer } from './schema-explorer-snapshot-worker';

function federatedSchema() {
  const result = composeServices([
    {
      name: 'users',
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
        type Query {
          user(id: ID!): User
        }
        type User @key(fields: "id") {
          id: ID!
          name: String @deprecated(reason: "Use fullName.")
          fullName: String
        }
      `),
    },
    {
      name: 'posts',
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
        type Query {
          posts(first: Int = 10): [Post!]!
        }
        type Post @key(fields: "id") {
          id: ID!
          author: User
        }
        type User @key(fields: "id") {
          id: ID!
          posts: [Post!]!
        }
      `),
    },
  ]);
  if (result.errors?.length) {
    throw result.errors[0];
  }
  return { compositeSdl: result.publicSdl!, supergraphSdl: result.supergraphSdl! };
}

test('builds the same snapshot as building on the main thread', () => {
  const input = federatedSchema();

  const fromWorker = buildSchemaExplorerSnapshotBuffer(input);
  const local = encodeSchemaExplorerSnapshot(
    buildSchemaExplorerSnapshot(parse(input.compositeSdl), parse(input.supergraphSdl)),
  );

  expect(fromWorker.equals(local)).toBe(true);
});

test('the snapshot can be read after being posted to the main thread', () => {
  const posted: Uint8Array = structuredClone(buildSchemaExplorerSnapshotBuffer(federatedSchema()));
  expect(Buffer.isBuffer(posted)).toBe(false);

  const reader = SchemaExplorerSnapshotReader.fromBuffer(
    Buffer.from(posted.buffer, posted.byteOffset, posted.byteLength),
  );

  expect(reader?.getOwnedBy('User.posts')).toEqual(['posts']);
  expect(reader?.getTypeEntity('Query')).toMatchObject({
    fields: [
      { name: 'posts', args: [{ name: 'first', defaultValue: 10 }] },
      { name: 'user', args: [{ name: 'id' }] },
    ],
  });
  expect(reader?.deprecatedTypes).toEqual(['User']);
});

test('without workers, the shared schema worker pool builds on the main thread', async () => {
  const input = federatedSchema();
  const builder = new SchemaExplorerSnapshotBuilder(
    new SchemaWorkerPool(
      {} as Logger,
      new SchemaWorkerConfig({ workerCount: 0, maxOldGenerationSizeMb: 0, timeoutMs: 0 }),
    ),
  );

  const bytes = await builder.build(input);

  expect(bytes.equals(buildSchemaExplorerSnapshotBuffer(input))).toBe(true);
});
