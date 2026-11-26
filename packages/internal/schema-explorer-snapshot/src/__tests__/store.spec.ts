import Redis from 'ioredis-mock';
import {
  autoFixCompositeSchemaSdl,
  buildSchemaExplorerSnapshotBuffer,
  hasSchemaExplorerSnapshot,
  readSchemaExplorerSnapshot,
  SCHEMA_EXPLORER_SNAPSHOT_TTL_SECONDS,
  schemaExplorerSnapshotKey,
  writeSchemaExplorerSnapshot,
} from '../store';

let port = 3000;

test('a written snapshot reads back, compressed and with a TTL', async () => {
  const redis = new Redis(port++);
  const snapshot = buildSchemaExplorerSnapshotBuffer({
    compositeSdl: /* GraphQL */ `
      type Query {
        hello(name: String = "you"): String
      }
    `,
    supergraphSdl: null,
  });

  expect(await hasSchemaExplorerSnapshot(redis, 'version-1')).toBe(false);
  expect(await readSchemaExplorerSnapshot(redis, 'version-1')).toBe(null);

  await writeSchemaExplorerSnapshot(redis, 'version-1', snapshot);

  expect(await hasSchemaExplorerSnapshot(redis, 'version-1')).toBe(true);
  const stored = await redis.getBuffer(schemaExplorerSnapshotKey('version-1'));
  expect(stored!.length).toBeLessThan(snapshot.length);
  const ttl = await redis.ttl(schemaExplorerSnapshotKey('version-1'));
  expect(ttl).toBeGreaterThan(0);
  expect(ttl).toBeLessThanOrEqual(SCHEMA_EXPLORER_SNAPSHOT_TTL_SECONDS);

  const reader = await readSchemaExplorerSnapshot(redis, 'version-1');
  expect(reader?.getTypeEntity('Query')).toMatchObject({
    fields: [{ name: 'hello', args: [{ name: 'name', defaultValue: 'you' }] }],
  });
});

test('a stored value that is not a snapshot throws', async () => {
  const redis = new Redis(port++);
  await redis.set(schemaExplorerSnapshotKey('version-1'), Buffer.from('not a snapshot'));

  await expect(readSchemaExplorerSnapshot(redis, 'version-1')).rejects.toThrow();
});

describe('autoFixCompositeSchemaSdl', () => {
  test('a clean public schema is returned as is', () => {
    const sdl = 'type Query {\n  hello: String\n}';
    const onFix = vi.fn();
    expect(autoFixCompositeSchemaSdl(sdl, onFix)).toBe(sdl);
    expect(onFix).not.toHaveBeenCalled();
  });

  test('type extensions are merged into their definitions', () => {
    const onFix = vi.fn();
    const fixed = autoFixCompositeSchemaSdl(
      'type Query { a: String }\nextend type Query { b: String }',
      onFix,
    );
    expect(fixed).not.toContain('extend');
    expect(fixed).toContain('a: String');
    expect(fixed).toContain('b: String');
    expect(onFix).toHaveBeenCalledTimes(1);
  });

  test('a persisted supergraph spec is stripped', () => {
    const onFix = vi.fn();
    const fixed = autoFixCompositeSchemaSdl(
      /* GraphQL */ `
        schema
          @link(url: "https://specs.apollo.dev/link/v1.0")
          @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
          query: Query
        }
        directive @join__type(graph: join__Graph!) repeatable on OBJECT
        enum join__Graph {
          A @join__graph(name: "a", url: "")
        }
        scalar link__Import
        enum link__Purpose {
          SECURITY
          EXECUTION
        }
        directive @link(
          url: String
          as: String
          for: link__Purpose
          import: [link__Import]
        ) repeatable on SCHEMA
        directive @join__graph(name: String!, url: String!) on ENUM_VALUE
        type Query @join__type(graph: A) {
          hello: String
        }
      `,
      onFix,
    );
    expect(fixed).not.toContain('join__');
    expect(fixed).toContain('hello: String');
    expect(onFix).toHaveBeenCalledTimes(1);
  });
});
