import { parse } from 'graphql';
import { composeServices } from '@theguild/federation-composition';
import { makeLogger, makePg } from './metric-alert-test-utils.js';
import { createSupergraphOwnershipLoader } from './supergraph-ownership.js';

const composed = composeServices([
  {
    name: 'users',
    typeDefs: parse(/* GraphQL */ `
      type Query {
        me: User
      }
      type User @key(fields: "id") {
        id: ID!
        name: String
      }
    `),
  },
  {
    name: 'reviews',
    typeDefs: parse(/* GraphQL */ `
      type Query {
        reviews: [Review!]!
      }
      type Review {
        id: ID!
        body: String
      }
      type User @key(fields: "id") {
        id: ID!
        reviews: [Review!]!
      }
    `),
  },
]);
if (!composed.supergraphSdl) {
  throw new Error('fixture supergraph failed to compose');
}
const supergraphSdl = composed.supergraphSdl;

const isVersionQuery = (sql: string) => sql.includes('metricAlertLatestComposableVersion');
const isSdlQuery = (sql: string) => sql.includes('metricAlertSupergraphSdl');

// Each test uses its own version id: the ownership cache is module-level and keyed by it.
let n = 0;
const nextVersion = () => `version-${++n}`;

describe('createSupergraphOwnershipLoader', () => {
  test('loads the latest composable version, then its supergraph, and extracts ownership', async () => {
    const versionId = nextVersion();
    const { pg, calls } = makePg(sql => {
      if (isVersionQuery(sql)) return versionId;
      if (isSdlQuery(sql)) return supergraphSdl;
      throw new Error(`unexpected query: ${sql}`);
    });
    const loader = createSupergraphOwnershipLoader(pg, makeLogger().logger);

    const result = await loader.load('t1');
    expect(result.info).not.toBeNull();
    expect(result.info && 'versionId' in result && result.versionId).toBe(versionId);
    expect(result.info?.schemaCoordinateServicesMappings.get('Review.body')).toEqual(['reviews']);
    expect(result.info?.objectFieldCoordinates.has('User.reviews')).toBe(true);
    expect(calls.map(c => (isVersionQuery(c.sql) ? 'version' : 'sdl'))).toEqual(['version', 'sdl']);
    expect(calls[0].values).toEqual(['t1']);
    expect(calls[1].values).toEqual([versionId]);
  });

  test('no composable version', async () => {
    const { pg, calls } = makePg(() => null);
    const loader = createSupergraphOwnershipLoader(pg, makeLogger().logger);
    expect(await loader.load('t1')).toEqual({ info: null, reason: 'no-composable-version' });
    expect(calls).toHaveLength(1);
  });

  test('a version without a stored supergraph', async () => {
    const versionId = nextVersion();
    const { pg } = makePg(sql => (isVersionQuery(sql) ? versionId : null));
    const loader = createSupergraphOwnershipLoader(pg, makeLogger().logger);
    expect(await loader.load('t1')).toEqual({ info: null, reason: 'no-supergraph-sdl' });
  });

  test('a supergraph that does not parse is reported, not thrown', async () => {
    const versionId = nextVersion();
    const { pg } = makePg(sql => (isVersionQuery(sql) ? versionId : 'type Query {'));
    const { logger, warnings } = makeLogger();
    const loader = createSupergraphOwnershipLoader(pg, logger);
    expect(await loader.load('t1')).toEqual({ info: null, reason: 'supergraph-parse-failed' });
    expect(warnings).toHaveLength(1);
  });

  test('concurrent loads for one target within a tick share a single lookup', async () => {
    const versionId = nextVersion();
    const { pg, calls } = makePg(sql => (isVersionQuery(sql) ? versionId : supergraphSdl));
    const loader = createSupergraphOwnershipLoader(pg, makeLogger().logger);
    const [a, b] = await Promise.all([loader.load('t1'), loader.load('t1')]);
    expect(a).toBe(b);
    expect(calls.filter(c => isVersionQuery(c.sql))).toHaveLength(1);
    expect(calls.filter(c => isSdlQuery(c.sql))).toHaveLength(1);
  });

  test('a later tick re-checks the version but reuses the parsed ownership', async () => {
    const versionId = nextVersion();
    const { pg, calls } = makePg(sql => (isVersionQuery(sql) ? versionId : supergraphSdl));
    const first = await createSupergraphOwnershipLoader(pg, makeLogger().logger).load('t1');
    const second = await createSupergraphOwnershipLoader(pg, makeLogger().logger).load('t1');
    expect(second.info).toBe(first.info);
    expect(calls.filter(c => isVersionQuery(c.sql))).toHaveLength(2);
    expect(calls.filter(c => isSdlQuery(c.sql))).toHaveLength(1);
  });
});
