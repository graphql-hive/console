import 'reflect-metadata';
import { schemaPush } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { psql } from '@hive/postgres';
import { initSeed } from '../../../testkit/seed';

const SchemaPublish = graphql(/* GraphQL */ `
  mutation TestSchemaRevisionPublish($input: SchemaPublishInput!) {
    schemaPublish(input: $input) {
      __typename
      ... on SchemaPublishSuccess {
        valid
      }
      ... on SchemaPublishError {
        errors {
          nodes {
            message
          }
        }
      }
    }
  }
`);

const LatestSchemaRevision = graphql(/* GraphQL */ `
  query TestLatestSchemaRevision($target: TargetReferenceInput!) {
    target(reference: $target) {
      latestSchemaVersion {
        origin {
          ... on SchemaVersionPublishOrigin {
            revision
            publishedSubgraphs {
              name
              revision
            }
          }
        }
        subgraphDiffs {
          ... on SubgraphDiffAdded {
            subgraphVersion {
              revision
            }
          }
        }
        schemas {
          nodes {
            ... on SingleSchema {
              revision {
                id
                service
                revision
                digest
              }
            }
            ... on CompositeSchema {
              service
              revision {
                id
                service
                revision
                digest
              }
            }
          }
        }
      }
    }
  }
`);

test.concurrent(
  'pushes and publishes a monolith revision, and rejects an unknown revision',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await schemaPush(
      {
        target: targetReference,
        revision: 'MonolithV1',
        sdl: 'type Query { product: String }',
      },
      token.secret,
    ).then(result => result.expectNoGraphQLErrors());
    expect(push.schemaPush.error).toBeNull();
    expect(push.schemaPush.ok?.schemaRevision.revision).toBe('MonolithV1');

    const publish = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          author: 'Test',
          commit: 'monolith-v1',
          schema: { revision: 'MonolithV1' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(publish.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishSuccess',
      valid: true,
    });

    const missing = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          author: 'Test',
          commit: 'missing',
          schema: { revision: 'MissingRevision' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(missing.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishError',
      errors: { nodes: [{ message: "Schema revision 'MissingRevision' was not found." }] },
    });
  },
);

test.concurrent(
  'pushes and publishes a federation revision, and rejects an unknown revision',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await schemaPush(
      {
        target: targetReference,
        service: 'Products',
        revision: 'FederationV1',
        sdl: 'type Query { product: Product } type Product @key(fields: "id") { id: ID! }',
      },
      token.secret,
    ).then(result => result.expectNoGraphQLErrors());
    expect(push.schemaPush.error).toBeNull();
    expect(push.schemaPush.ok?.schemaRevision).toMatchObject({
      service: 'products',
      revision: 'FederationV1',
    });

    const publish = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          service: 'PRODUCTS',
          url: 'https://products.example.com/graphql',
          author: 'Test',
          commit: 'federation-v1',
          schema: { revision: 'FederationV1' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(publish.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishSuccess',
      valid: true,
    });

    const missing = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          service: 'products',
          url: 'https://products.example.com/graphql',
          author: 'Test',
          commit: 'missing',
          schema: { revision: 'MissingRevision' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(missing.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishError',
      errors: { nodes: [{ message: "Schema revision 'MissingRevision' was not found." }] },
    });
  },
);

test.concurrent('rejects a conflicting monolith revision', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;

  await schemaPush(
    { target: targetReference, revision: 'v1', sdl: 'type Query { one: String }' },
    token.secret,
  ).then(result => result.expectNoGraphQLErrors());
  const conflict = await schemaPush(
    { target: targetReference, revision: 'v1', sdl: 'type Query { two: String }' },
    token.secret,
  ).then(result => result.expectNoGraphQLErrors());

  expect(conflict.schemaPush.ok).toBeNull();
  expect(conflict.schemaPush.error?.message).toContain(
    "Revision 'v1' already exists with a different schema.",
  );
  expect(conflict.schemaPush.error?.message).toContain('Existing digest: hive-sdl-v1:sha256:');
  expect(conflict.schemaPush.error?.message).toContain('Submitted digest: hive-sdl-v1:sha256:');
});

test.concurrent('rejects a conflicting federation revision', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;

  await schemaPush(
    {
      target: targetReference,
      service: 'products',
      revision: 'v1',
      sdl: 'type Query { one: String }',
    },
    token.secret,
  ).then(result => result.expectNoGraphQLErrors());
  const conflict = await schemaPush(
    {
      target: targetReference,
      service: 'products',
      revision: 'v1',
      sdl: 'type Query { two: String }',
    },
    token.secret,
  ).then(result => result.expectNoGraphQLErrors());

  expect(conflict.schemaPush.ok).toBeNull();
  expect(conflict.schemaPush.error?.message).toContain(
    "Revision 'products@v1' already exists with a different schema.",
  );
  expect(conflict.schemaPush.error?.message).toContain('Existing digest: hive-sdl-v1:sha256:');
  expect(conflict.schemaPush.error?.message).toContain('Submitted digest: hive-sdl-v1:sha256:');
});

test.concurrent(
  'queries the revision from a published monolith schema version',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await schemaPush(
      {
        target: targetReference,
        revision: 'MonolithRevision',
        sdl: 'type Query { product: String }',
      },
      token.secret,
    ).then(result => result.expectNoGraphQLErrors());
    await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          author: 'Test',
          commit: 'monolith-revision',
          schema: { revision: 'MonolithRevision' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());

    const result = await execute({
      document: LatestSchemaRevision,
      token: token.secret,
      variables: { target: targetReference },
    }).then(response => response.expectNoGraphQLErrors());
    expect(result.target?.latestSchemaVersion?.schemas.nodes[0]).toMatchObject({
      revision: {
        id: push.schemaPush.ok?.schemaRevision.id,
        service: null,
        revision: 'MonolithRevision',
        digest: push.schemaPush.ok?.schemaRevision.digest,
      },
    });
    expect(result.target?.latestSchemaVersion?.origin).toMatchObject({
      revision: 'MonolithRevision',
    });
  },
);

test.concurrent(
  'queries the revision from a published federation schema version',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await schemaPush(
      {
        target: targetReference,
        service: 'products',
        revision: 'FederationRevision',
        sdl: 'type Query { product: Product } type Product @key(fields: "id") { id: ID! }',
      },
      token.secret,
    ).then(result => result.expectNoGraphQLErrors());
    await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          service: 'products',
          url: 'https://products.example.com/graphql',
          author: 'Test',
          commit: 'federation-revision',
          schema: { revision: 'FederationRevision' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());

    const result = await execute({
      document: LatestSchemaRevision,
      token: token.secret,
      variables: { target: targetReference },
    }).then(response => response.expectNoGraphQLErrors());
    expect(result.target?.latestSchemaVersion?.schemas.nodes[0]).toMatchObject({
      service: 'products',
      revision: {
        id: push.schemaPush.ok?.schemaRevision.id,
        service: 'products',
        revision: 'FederationRevision',
        digest: push.schemaPush.ok?.schemaRevision.digest,
      },
    });
    expect(result.target?.latestSchemaVersion?.origin).toMatchObject({
      revision: null,
      publishedSubgraphs: [
        {
          name: 'products',
          revision: 'FederationRevision',
        },
      ],
    });
    expect(result.target?.latestSchemaVersion?.subgraphDiffs).toMatchObject([
      {
        subgraphVersion: {
          revision: 'FederationRevision',
        },
      },
    ]);
  },
);

test.concurrent('pushing an identical revision again is skipped', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const input = {
    target: { byId: target.id },
    revision: 'v1',
    sdl: 'type Query { one: String }',
  };

  const first = await schemaPush(input, token.secret).then(r => r.expectNoGraphQLErrors());
  const second = await schemaPush(input, token.secret).then(r => r.expectNoGraphQLErrors());

  expect(first.schemaPush.ok?.isSkipped).toBe(false);
  expect(second.schemaPush.error).toBeNull();
  expect(second.schemaPush.ok?.isSkipped).toBe(true);
  expect(second.schemaPush.ok?.schemaRevision.id).toBe(first.schemaPush.ok?.schemaRevision.id);
});

test.concurrent('concurrent pushes of the same revision both succeed', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const input = {
    target: { byId: target.id },
    revision: 'concurrent',
    sdl: 'type Query { one: String }',
  };

  const results = await Promise.all([
    schemaPush(input, token.secret).then(r => r.expectNoGraphQLErrors()),
    schemaPush(input, token.secret).then(r => r.expectNoGraphQLErrors()),
  ]);

  expect(results.map(result => result.schemaPush.error)).toEqual([null, null]);
  expect(results.filter(result => result.schemaPush.ok?.isSkipped === false)).toHaveLength(1);
});

test.concurrent('ignores the service name for single-schema projects', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });

  const push = await schemaPush(
    {
      target: { byId: target.id },
      service: 'products',
      revision: 'v1',
      sdl: 'type Query { one: String }',
    },
    token.secret,
  ).then(r => r.expectNoGraphQLErrors());

  expect(push.schemaPush.error).toBeNull();
  expect(push.schemaPush.ok?.schemaRevision.service).toBeNull();
});

test.concurrent('rejects an invalid service name', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({ mode: 'readWrite' });

  const push = await schemaPush(
    {
      target: { byId: target.id },
      service: '1-invalid',
      revision: 'v1',
      sdl: 'type Query { one: String }',
    },
    token.secret,
  ).then(r => r.expectNoGraphQLErrors());

  expect(push.schemaPush.ok).toBeNull();
  expect(push.schemaPush.error?.message).toContain('Invalid service name.');
});

test.concurrent('accepts an invalid service name of an existing service', async ({ expect }) => {
  const seed = initSeed();
  const { createOrg } = await seed.createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;
  const sdl = 'type Query { one: String }';

  const initialPublish = await execute({
    document: SchemaPublish,
    token: token.secret,
    variables: {
      input: {
        target: targetReference,
        service: 'products',
        url: 'https://products.example.com/graphql',
        author: 'Test',
        commit: 'initial',
        schema: { sdl },
      },
    },
  }).then(result => result.expectNoGraphQLErrors());
  expect(initialPublish.schemaPublish.__typename).toBe('SchemaPublishSuccess');

  // Services created before the naming rules existed can have names that are not valid anymore.
  await using connection = await seed.createDbConnection();
  // Schema logs are linked to a target through the schema versions that include them.
  const renamed = await connection.pool.any(psql`
    UPDATE "schema_log"
    SET "service_name" = '1-legacy'
    WHERE "service_name" = 'products'
      AND "id" IN (
        SELECT "schema_version_to_log"."action_id"
        FROM "schema_version_to_log"
        JOIN "schema_versions" ON "schema_versions"."id" = "schema_version_to_log"."version_id"
        WHERE "schema_versions"."target_id" = ${target.id}
      )
    RETURNING "id"
  `);
  expect(renamed).toHaveLength(1);

  const push = await schemaPush(
    { target: targetReference, service: '1-legacy', revision: 'v1', sdl },
    token.secret,
  ).then(r => r.expectNoGraphQLErrors());

  expect(push.schemaPush.error).toBeNull();
  expect(push.schemaPush.ok?.schemaRevision.service).toBe('1-legacy');

  const publish = await execute({
    document: SchemaPublish,
    token: token.secret,
    variables: {
      input: {
        target: targetReference,
        service: '1-legacy',
        author: 'Test',
        commit: 'v1',
        schema: { revision: 'v1' },
      },
    },
  }).then(result => result.expectNoGraphQLErrors());
  expect(publish.schemaPublish.__typename).toBe('SchemaPublishSuccess');
});

test.concurrent(
  'publishing a revision without a service in a federation project reports the missing service',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({ mode: 'readWrite' });

    const publish = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: { byId: target.id },
          author: 'Test',
          commit: 'v1',
          schema: { revision: 'v1' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());

    expect(publish.schemaPublish.__typename).toBe('SchemaPublishMissingServiceError');
  },
);

test.concurrent('an expired revision can be pushed again', async ({ expect }) => {
  const seed = initSeed();
  const { createOrg } = await seed.createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;

  const first = await schemaPush(
    { target: targetReference, revision: 'expiring', sdl: 'type Query { one: String }' },
    token.secret,
  ).then(r => r.expectNoGraphQLErrors());

  await using connection = await seed.createDbConnection();
  await connection.pool.query(psql`
    UPDATE "schema_revisions"
    SET "expires_at" = now() - interval '1 day'
    WHERE "id" = ${first.schemaPush.ok!.schemaRevision.id}
  `);

  const second = await schemaPush(
    { target: targetReference, revision: 'expiring', sdl: 'type Query { two: String }' },
    token.secret,
  ).then(r => r.expectNoGraphQLErrors());

  expect(second.schemaPush.error).toBeNull();
  expect(second.schemaPush.ok?.isSkipped).toBe(false);
  expect(second.schemaPush.ok?.schemaRevision.id).not.toBe(first.schemaPush.ok?.schemaRevision.id);

  const publish = await execute({
    document: SchemaPublish,
    token: token.secret,
    variables: {
      input: {
        target: targetReference,
        author: 'Test',
        commit: 'expiring',
        schema: { revision: 'expiring' },
      },
    },
  }).then(result => result.expectNoGraphQLErrors());
  expect(publish.schemaPublish).toMatchObject({ __typename: 'SchemaPublishSuccess', valid: true });
});
