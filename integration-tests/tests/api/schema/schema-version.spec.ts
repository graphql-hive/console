import { ProjectType } from 'testkit/gql/graphql';
import { assertNonNullish } from 'testkit/utils';
import { psql } from '@hive/postgres';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const SchemaByCommitQuery = graphql(/* GraphQL */ `
  query SchemaByCommitQuery($commit: String!, $targetRef: TargetReferenceInput) {
    schemaVersionByCommit(commit: $commit, target: $targetRef) {
      id
      sdl
      meta {
        author
        commit
      }
    }
  }
`);

const PaginatedSchemaVersionsQuery = graphql(/* GraphQL */ `
  query PaginatedSchemaVersionsQuery(
    $targetRef: TargetReferenceInput!
    $first: Int!
    $after: String
  ) {
    target(reference: $targetRef) {
      schemaVersions(first: $first, after: $after) {
        edges {
          cursor
          node {
            meta {
              commit
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`);

test.concurrent(
  'schema version pagination excludes legacy versions without duplicates',
  async ({ expect }) => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({});

    for (const commit of ['legacy-1', 'legacy-2']) {
      await token
        .publishSchema({
          commit,
          sdl: `type Query { ${commit.replace('-', '_')}: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());
    }

    const { pool } = await seed.createDbConnection();
    await pool.query(psql`
      UPDATE "schema_versions"
      SET "graph_id" = NULL
      WHERE "target_id" = ${target.id}
    `);

    for (const commit of ['linked-1', 'linked-2']) {
      await token
        .publishSchema({
          commit,
          sdl: `type Query { ${commit.replace('-', '_')}: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());
    }

    const commits: Array<string | null> = [];
    let after: string | null = null;

    do {
      const result = await execute({
        document: PaginatedSchemaVersionsQuery,
        authToken: token.secret,
        variables: {
          targetRef: { byId: target.id },
          first: 1,
          after,
        },
      }).then(r => r.expectNoGraphQLErrors());

      const connection = result.target?.schemaVersions;
      assertNonNullish(connection);
      expect(connection.edges).toHaveLength(1);

      commits.push(connection.edges[0].node.meta?.commit ?? null);
      after = connection.pageInfo.endCursor;
      if (!connection.pageInfo.hasNextPage) {
        break;
      }
    } while (after);

    expect(commits).toEqual(['linked-2', 'linked-1']);
    expect(new Set(commits).size).toBe(commits.length);
    await pool.end();
  },
);

test.concurrent(
  'schema version pagination includes legacy versions without duplicates for backfilled graph',
  async () => {
    const seed = initSeed();
    const { createOrg } = await seed.createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({});
    const { pool } = await seed.createDbConnection();

    await pool.query(psql`
      UPDATE "graphs"
      SET "is_backfilled" = TRUE
      WHERE "target_id" = ${target.id}
    `);

    for (const commit of ['legacy-1', 'legacy-2']) {
      await token
        .publishSchema({
          commit,
          sdl: `type Query { ${commit.replace('-', '_')}: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());
    }

    await pool.query(psql`
    UPDATE "schema_versions"
    SET "graph_id" = NULL
    WHERE "target_id" = ${target.id}
  `);

    for (const commit of ['linked-1', 'linked-2']) {
      await token
        .publishSchema({
          commit,
          sdl: `type Query { ${commit.replace('-', '_')}: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());
    }

    const commits: Array<string | null> = [];
    let after: string | null = null;

    do {
      const result = await execute({
        document: PaginatedSchemaVersionsQuery,
        authToken: token.secret,
        variables: {
          targetRef: { byId: target.id },
          first: 1,
          after,
        },
      }).then(r => r.expectNoGraphQLErrors());

      const connection = result.target?.schemaVersions;
      assertNonNullish(connection);
      expect(connection.edges).toHaveLength(1);

      commits.push(connection.edges[0].node.meta?.commit ?? null);
      after = connection.pageInfo.endCursor;
      if (!connection.pageInfo.hasNextPage) {
        break;
      }
    } while (after);

    expect(commits).toEqual(['linked-2', 'linked-1', 'legacy-2', 'legacy-1']);
    expect(new Set(commits).size).toBe(commits.length);
    await pool.end();
  },
);

test.concurrent(
  'schema version by commit returns latest schema for the commit',
  async ({ expect }) => {
    const commit = 'tiny-test-0';
    const schema = /* GraphQL */ `
      type Query {
        ping: String
      }
    `;
    const latestSchema = /* GraphQL */ `
      type Query {
        ping: String
        pong: String
      }
    `;
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Single);

    const token = await createTargetAccessToken({
      mode: 'readWrite',
    });

    await token
      .publishSchema({
        sdl: schema,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());

    await token
      .publishSchema({
        sdl: latestSchema,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());

    const result = await execute({
      document: SchemaByCommitQuery,
      token: token.secret,
      variables: {
        commit,
        targetRef: { byId: target.id },
      },
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.schemaVersionByCommit?.sdl).toIncludeSubstringWithoutWhitespace(latestSchema);
  },
);

test.concurrent(
  'correct schema version is returned for commit being used multiple times in the same project in different targets',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target, createTarget } = await createProject(
      ProjectType.Single,
    );
    const commit = 'shared-commit-hash';
    const targetToken = await createTargetAccessToken({});
    await targetToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());
    const createOtherTargetResult = await createTarget().then(r => r.expectNoGraphQLErrors());
    const otherTarget = createOtherTargetResult.createTarget.ok?.createdTarget;
    assertNonNullish(otherTarget, 'Target should be created');
    const otherTargetToken = await createTargetAccessToken({
      target: otherTarget,
    });
    await otherTargetToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String!
          }
        `,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());

    const targetResult = await execute({
      document: SchemaByCommitQuery,
      token: targetToken.secret,
      variables: {
        commit,
        targetRef: { byId: target.id },
      },
    }).then(r => r.expectNoGraphQLErrors());
    expect(targetResult.schemaVersionByCommit?.sdl).toMatchInlineSnapshot(`
      type Query {
        a: String!
      }
    `);

    const otherTargetResult = await execute({
      document: SchemaByCommitQuery,
      token: otherTargetToken.secret,
      variables: {
        commit,
        targetRef: { byId: otherTarget.id },
      },
    }).then(r => r.expectNoGraphQLErrors());
    expect(otherTargetResult.schemaVersionByCommit?.sdl).toMatchInlineSnapshot(`
      type Query {
        b: String!
      }
    `);
  },
);

test.concurrent(
  'valid monolith schema ignores the schema composition auto fix',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({});

    const sdl = /* GraphQL */ `
      schema {
        query: RootQueryType
      }

      type Link {
        link: String
      }

      type RootQueryType {
        foo: Link
      }
    `;

    await token
      .publishSchema({
        sdl,
      })
      .then(r => r.expectNoGraphQLErrors());

    const schema = await token.fetchLatestValidSchema();

    expect(schema.latestValidVersion?.sdl).toMatchInlineSnapshot(sdl);
  },
);
