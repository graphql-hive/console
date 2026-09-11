import { addDays, formatISO } from 'date-fns';
import { ProjectType } from 'testkit/gql/graphql';
import z from 'zod';
import { psql } from '@hive/postgres';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const skipLegacyTests = !!process.env.SCHEMA_VERSION_ORIGIN_CUTOFF;
const originCutoff = new Date(process.env.SCHEMA_VERSION_ORIGIN_CUTOFF ?? new Date());

const SchemaPublishCountQuery = graphql(/* GraphQL */ `
  query SchemaPublishCount(
    $target: TargetReferenceInput!
    $period: DateRangeInput!
    $subgraphNames: [String!]
  ) {
    target(reference: $target) {
      schemaPublishCount(period: $period, subgraphNames: $subgraphNames)
    }
  }
`);

function getSchemaPublishCount(input: {
  authToken: string;
  targetId: string;
  period: { from: string; to: string };
  subgraphNames?: string[];
}) {
  return execute({
    document: SchemaPublishCountQuery,
    authToken: input.authToken,
    variables: {
      target: { byId: input.targetId },
      period: input.period,
      subgraphNames: input.subgraphNames,
    },
  }).then(r => r.expectNoGraphQLErrors());
}

test
  .skipIf(skipLegacyTests)
  .concurrent('counts legacy schema publishes by subgraph', async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({});

    await token
      .publishSchema({
        service: 'Products',
        sdl: /* GraphQL */ `
          type Product @key(fields: "id") {
            id: ID!
          }

          type Query {
            product: Product
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());
    await token
      .publishSchema({
        service: 'Reviews',
        sdl: /* GraphQL */ `
          type Review @key(fields: "id") {
            id: ID!
          }

          type Query {
            review: Review
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());
    await token
      .publishSchema({
        service: 'Products',
        sdl: /* GraphQL */ `
          type Product @key(fields: "id") {
            id: ID!
            name: String
          }

          type Query {
            product: Product
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());

    await using connection = await seed.createDbConnection();
    await connection.pool.query(psql`
    UPDATE "schema_versions"
    SET
      "origin" = NULL,
      "created_at" = ${addDays(originCutoff, -1).toISOString()}
    WHERE "target_id" = ${target.id}
  `);

    const period = {
      from: addDays(originCutoff, -2).toISOString(),
      to: originCutoff.toISOString(),
    };
    const getCount = (subgraphNames?: string[]) =>
      getSchemaPublishCount({ authToken: ownerToken, targetId: target.id, period, subgraphNames });

    let countResult = await getCount();
    expect(countResult).toMatchObject({
      target: { schemaPublishCount: 3 },
    });
    countResult = await getCount(['pRoDuCtS']);
    expect(countResult).toMatchObject({
      target: { schemaPublishCount: 2 },
    });
  });

test.concurrent('counts schema publishes from origin data by subgraph', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({});

  await token
    .publishSchema({
      service: 'Products',
      sdl: 'type Query { product: String }',
    })
    .then(r => r.expectNoGraphQLErrors());
  await token
    .publishSchema({
      service: 'Reviews',
      sdl: 'type Query { review: String }',
    })
    .then(r => r.expectNoGraphQLErrors());

  const period = {
    from: formatISO(addDays(new Date(), -1)),
    to: formatISO(addDays(new Date(), 1)),
  };

  let publishCountResult = await getSchemaPublishCount({
    authToken: ownerToken,
    targetId: target.id,
    period,
  });

  expect(publishCountResult).toMatchObject({ target: { schemaPublishCount: 2 } });
  publishCountResult = await getSchemaPublishCount({
    authToken: ownerToken,
    targetId: target.id,
    period,
    subgraphNames: ['pRoDuCtS'],
  });
  expect(publishCountResult).toMatchObject({ target: { schemaPublishCount: 1 } });
});

test
  .skipIf(skipLegacyTests)
  .concurrent('combines legacy and origin schema publish counts', async ({ expect }) => {
    const seed = initSeed();
    const { createOrg, ownerToken } = await seed.createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({});

    await token
      .publishSchema({ service: 'Products', sdl: 'type Query { product: String }' })
      .then(r => r.expectNoGraphQLErrors());
    await token
      .publishSchema({
        service: 'Products',
        sdl: 'type Query { product: String, products: [String!]! }',
      })
      .then(r => r.expectNoGraphQLErrors());

    await using connection = await seed.createDbConnection();
    const versions = await connection.pool
      .any(
        psql`
      SELECT "id"
      FROM "schema_versions"
      WHERE "target_id" = ${target.id}
      ORDER BY "created_at" ASC
    `,
      )
      .then(z.array(z.object({ id: z.string() })).parse);
    expect(versions).toHaveLength(2);

    await connection.pool.query(psql`
    UPDATE "schema_versions"
    SET
      "origin" = NULL,
      "created_at" = ${addDays(originCutoff, -1).toISOString()}
    WHERE "id" = ${versions[0]!.id}
  `);
    await connection.pool.query(psql`
    UPDATE "schema_versions"
    SET "created_at" = ${addDays(originCutoff, 1).toISOString()}
    WHERE "id" = ${versions[1]!.id}
  `);

    const countResult = getSchemaPublishCount({
      authToken: ownerToken,
      targetId: target.id,
      period: {
        from: addDays(originCutoff, -2).toISOString(),
        to: addDays(originCutoff, 2).toISOString(),
      },
      subgraphNames: ['products'],
    });

    expect(countResult).toMatchObject({ target: { schemaPublishCount: 2 } });
  });
