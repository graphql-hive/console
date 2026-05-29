import 'reflect-metadata';
/* eslint-disable no-process-env */
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { assertNonNullish } from 'testkit/utils';
import { PostgresDatabasePool, psql } from '@hive/postgres';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  deleteTarget,
  getSchemaVersionWithAllDetails,
  publishSchema,
  schemaVersionPromote,
} from '../../../testkit/flow';
import { initSeed } from '../../../testkit/seed';

/**
 * Helper function to clear the schema log edge data history in order to simulate a legacy record.
 */
async function clearSchemaLogEdgeHistory(pool: PostgresDatabasePool, targetId: string) {
  await pool.query(psql`
    UPDATE
      "schema_version_to_log"
    SET
      "type" = NULL
      , "previous_action_id" = NULL
      , "schema_changes" = NULL
      , "subgraph_name" = NULL
    WHERE
      "version_id" = ANY(
        SELECT
          "id"
        FROM
          "schema_versions"
        WHERE
          "target_id" = ${targetId}
      )
`);
}

test.concurrent('monolitic project schema version has no subgraph diff', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, fetchVersions, target } = await createProject(
    ProjectType.Single,
  );
  const readToken = await createTargetAccessToken({});
  await readToken
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
    })
    .then(r => r.expectNoGraphQLErrors());
  await readToken
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          b: String
        }
      `,
    })
    .then(r => r.expectNoGraphQLErrors());

  const [latestVersion] = await fetchVersions(1);
  assertNonNullish(latestVersion);

  const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
  assertNonNullish(version);
  expect(version.subgraphDiffs).toEqual(null);
});

test.concurrent('federation project schema version has subgraph diff', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, fetchVersions, target } = await createProject(
    ProjectType.Federation,
  );
  const readToken = await createTargetAccessToken({});
  const beforeSdl = /* GraphQL */ `
    type Query {
      a: String
    }
  `;
  const afterSdl = /* GraphQL */ `
    type Query {
      b: String
    }
  `;

  await readToken
    .publishSchema({
      sdl: beforeSdl,
      author: 'Foo',
      commit: 'a',
      service: 'a',
      url: 'http://localhost',
    })
    .then(r => r.expectNoGraphQLErrors());
  await readToken
    .publishSchema({
      sdl: afterSdl,
      author: 'Foo',
      commit: 'b',
      service: 'a',
    })
    .then(r => r.expectNoGraphQLErrors());

  const [latestVersion] = await fetchVersions(1);
  assertNonNullish(latestVersion);

  const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
  assertNonNullish(version);
  expect(version.subgraphDiffs).toMatchObject([
    {
      __typename: 'SubgraphDiffChanged',
      changes: {
        edges: [
          {
            node: {
              message: "Field 'a' was removed from object type 'Query'",
            },
          },
          {
            node: {
              message: "Field 'b' was added to object type 'Query'",
            },
          },
        ],
      },
      previousSubgraphVersion: {
        id: expect.any(String),
        sdl: expect.stringMatching('a: String'),
        serviceName: 'a',
      },
      subgraphVersion: {
        id: expect.any(String),
        sdl: expect.stringMatching('b: String'),
        serviceName: 'a',
      },
    },
  ]);
});

test.concurrent(
  'add new subgraph yields correct diff on new schema version',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'b',
        service: 'b',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    assertNonNullish(latestVersion);

    const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
    assertNonNullish(version);
    expect(version.subgraphDiffs).toHaveLength(2);
    expect(version.subgraphDiffs).toMatchObject([
      {
        __typename: 'SubgraphDiffUnchanged',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('a: String'),
          serviceName: 'a',
        },
      },
      {
        __typename: 'SubgraphDiffAdded',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('b: String'),
          serviceName: 'b',
        },
      },
    ]);
  },
);

test.concurrent('removing a subgraph yields correct diff  for publish', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, fetchVersions, target } = await createProject(
    ProjectType.Federation,
  );
  const readToken = await createTargetAccessToken({});

  await readToken
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
      author: 'Foo',
      commit: 'a',
      service: 'a',
      url: 'http://localhost',
    })
    .then(r => r.expectNoGraphQLErrors());
  await readToken
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          b: String
        }
      `,
      author: 'Foo',
      commit: 'b',
      service: 'b',
      url: 'http://localhost',
    })
    .then(r => r.expectNoGraphQLErrors());
  await readToken.deleteSchema('b').then(r => r.expectNoGraphQLErrors());

  const [latestVersion] = await fetchVersions(1);
  assertNonNullish(latestVersion);

  const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
  assertNonNullish(version);
  expect(version.subgraphDiffs).toHaveLength(2);
  expect(version.subgraphDiffs).toMatchObject([
    {
      __typename: 'SubgraphDiffUnchanged',
      subgraphVersion: {
        id: expect.any(String),
        sdl: expect.stringMatching('a: String'),
        serviceName: 'a',
      },
    },
    {
      __typename: 'SubgraphDiffRemoved',
      removedSubgraphVersion: {
        id: expect.any(String),
        sdl: expect.stringMatching('b: String'),
        serviceName: 'b',
      },
    },
  ]);
});

test.concurrent(
  'promoting schema version with yield correct subgraph diff for removals',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    const [initialVersion] = await fetchVersions(1);
    assertNonNullish(initialVersion);

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'b',
        service: 'b',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            c: String
          }
        `,
        author: 'Foo',
        commit: 'c',
        service: 'c',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    await schemaVersionPromote(
      {
        source: {
          fromSchemaVersionById: initialVersion.id,
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
    assertNonNullish(version);
    expect(version.subgraphDiffs).toHaveLength(3);
    expect(version.subgraphDiffs).toMatchObject([
      {
        __typename: 'SubgraphDiffUnchanged',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringContaining('a: String'),
          serviceName: 'a',
        },
      },
      {
        __typename: 'SubgraphDiffRemoved',
        removedSubgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringContaining('b: String'),
          serviceName: 'b',
        },
      },
      {
        __typename: 'SubgraphDiffRemoved',
        removedSubgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringContaining('c: String'),
          serviceName: 'c',
        },
      },
    ]);
  },
);

test.concurrent(
  'promoting schema version yields correct subgraph diff for mixed removals, additions, and updates',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'b',
        service: 'b',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            c: String
          }
        `,
        author: 'Foo',
        commit: 'c',
        service: 'c',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    const [rollbackVersion] = await fetchVersions(1);
    assertNonNullish(rollbackVersion);

    await readToken.deleteSchema('b');
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            cc: String
          }
        `,
        author: 'Foo',
        commit: 'c',
        service: 'c',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            d: String
          }
        `,
        author: 'Foo',
        commit: 'd',
        service: 'd',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    await schemaVersionPromote(
      {
        source: {
          fromSchemaVersionById: rollbackVersion.id,
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    const version = await getSchemaVersionWithAllDetails(target.id, latestVersion.id, ownerToken);
    assertNonNullish(version);
    expect(version.subgraphDiffs).toHaveLength(4);
    expect(version.subgraphDiffs).toMatchObject([
      {
        __typename: 'SubgraphDiffUnchanged',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('a: String'),
          serviceName: 'a',
        },
      },
      {
        __typename: 'SubgraphDiffAdded',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('b: String'),
          serviceName: 'b',
        },
      },
      {
        __typename: 'SubgraphDiffChanged',
        changes: {
          edges: [
            {
              node: {
                message: "Field 'cc' was removed from object type 'Query'",
              },
            },
            {
              node: {
                message: "Field 'c' was added to object type 'Query'",
              },
            },
          ],
        },
        previousSubgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('cc: String'),
          serviceName: 'c',
        },
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('c: String'),
          serviceName: 'c',
        },
      },
      {
        __typename: 'SubgraphDiffRemoved',
        removedSubgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('d: String'),
          serviceName: 'd',
        },
      },
    ]);
  },
);

/**
 * These tests cover the legacy fallback logic for existing database records that do not have the new data on the schema log edges
 */
describe('legacy schema version yields correct subgraph diff', () => {
  test.concurrent('publish new subgraph version', async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    const nonLegacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(nonLegacyVersion);

    // We manually convert the records to "legacy" records
    const { pool } = await seed.createDbConnection();
    await clearSchemaLogEdgeHistory(pool, target.id);
    const legacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(legacyVersion);

    // The differences that are expected:
    // - changes is null, so we manuall set them
    // aside from that the changes should be identical
    nonLegacyVersion.subgraphDiffs?.forEach(diff => {
      if (diff.__typename === 'SubgraphDiffChanged') {
        expect(diff.changes).not.toEqual(null);
        diff.changes = null;
      }
    });
    legacyVersion.subgraphDiffs?.forEach(diff => {
      if (diff.__typename === 'SubgraphDiffChanged') {
        expect(diff.changes).toEqual(null);
      }
    });
    expect(nonLegacyVersion.subgraphDiffs).toEqual(legacyVersion.subgraphDiffs);
  });

  test.concurrent('publish new subgraph', async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'b',
        service: 'b',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    const nonLegacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(nonLegacyVersion);

    // We manually convert the records to "legacy" records
    const { pool } = await seed.createDbConnection();
    await clearSchemaLogEdgeHistory(pool, target.id);
    const legacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(legacyVersion);

    expect(nonLegacyVersion.subgraphDiffs).toEqual(legacyVersion.subgraphDiffs);
  });

  test.concurrent('delete subgraph', async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions, target } = await createProject(
      ProjectType.Federation,
    );
    const readToken = await createTargetAccessToken({});

    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        author: 'Foo',
        commit: 'a',
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        author: 'Foo',
        commit: 'b',
        service: 'b',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());
    await readToken.deleteSchema('b');
    await readToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            cc: String
          }
        `,
        author: 'Foo',
        commit: 'c',
        service: 'c',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const [latestVersion] = await fetchVersions(1);
    const nonLegacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(nonLegacyVersion);

    // We manually convert the records to "legacy" records
    const { pool } = await seed.createDbConnection();
    await clearSchemaLogEdgeHistory(pool, target.id);
    const legacyVersion = await getSchemaVersionWithAllDetails(
      target.id,
      latestVersion.id,
      ownerToken,
    );
    assertNonNullish(legacyVersion);
    expect(nonLegacyVersion.subgraphDiffs).toEqual(legacyVersion.subgraphDiffs);
  });
});

test.concurrent(
  'deleting a target does not lead to a inconsistent promoted version state',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject, createOrganizationAccessToken } = await createOrg();
    const { target, fetchVersions, createTarget } = await createProject(ProjectType.Federation);
    const createTargetResult = await createTarget().then(r => r.expectNoGraphQLErrors());
    const otherTarget = createTargetResult.createTarget.ok?.createdTarget;
    assertNonNullish(otherTarget);
    const { privateAccessKey } = await createOrganizationAccessToken({
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: ['schemaVersion:publish', 'schemaVersion:promote'],
    });

    await publishSchema(
      {
        author: 'a',
        commit: 'a',
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        service: 'a',
        url: 'http://a',
        target: {
          byId: target.id,
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: otherTarget.id,
          },
        },
      },
      privateAccessKey,
    ).then(r => r.expectNoGraphQLErrors());

    expect(promoteResult.schemaVersionPromote).toMatchObject({
      ok: {},
      error: null,
    });

    const deleteTargetResult = await deleteTarget(
      {
        target: {
          byId: target.id,
        },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    expect(deleteTargetResult.deleteTarget).toMatchObject({
      ok: {},
      error: null,
    });

    const [promotedVersion] = await fetchVersions(1, otherTarget);

    // make sure that the version was not cascade deleted...
    assertNonNullish(promotedVersion);

    const promotedVersionWithDetails = await getSchemaVersionWithAllDetails(
      otherTarget.id,
      promotedVersion.id,
      ownerToken,
    );

    // make sure that the action was not cascade deleted
    expect(promotedVersionWithDetails?.subgraphDiffs).toMatchObject([
      {
        __typename: 'SubgraphDiffAdded',
        subgraphVersion: {
          id: expect.any(String),
          sdl: expect.stringMatching('a: String!'),
          serviceName: 'a',
        },
      },
    ]);
  },
);
