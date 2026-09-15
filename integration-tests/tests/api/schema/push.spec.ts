import 'reflect-metadata';
import { graphql } from 'testkit/gql';
import { ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const SchemaPush = graphql(/* GraphQL */ `
  mutation TestSchemaPush($input: SchemaPushInput!) {
    schemaPush(input: $input) {
      ok {
        schemaRevision {
          id
          service
          version
          digest
        }
      }
      error {
        message
      }
    }
  }
`);

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
            schemaRevisionVersion
            publishedSubgraphs {
              name
              schemaRevisionVersion
            }
          }
        }
        subgraphDiffs {
          ... on SubgraphDiffAdded {
            subgraphVersion {
              schemaRevisionVersion
            }
          }
        }
        schemas {
          nodes {
            ... on SingleSchema {
              revision {
                id
                service
                version
                digest
              }
            }
            ... on CompositeSchema {
              service
              revision {
                id
                service
                version
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
  'pushes and publishes a monolith revision, and rejects an unknown version',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await execute({
      document: SchemaPush,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          version: 'MonolithV1',
          sdl: 'type Query { product: String }',
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(push.schemaPush.error).toBeNull();
    expect(push.schemaPush.ok?.schemaRevision.version).toBe('MonolithV1');

    const publish = await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          author: 'Test',
          commit: 'monolith-v1',
          schema: { byVersion: 'MonolithV1' },
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
          schema: { byVersion: 'MissingVersion' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(missing.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishError',
      errors: { nodes: [{ message: "Schema version 'MissingVersion' was not found." }] },
    });
  },
);

test.concurrent(
  'pushes and publishes a federation revision, and rejects an unknown version',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
    const token = await createTargetAccessToken({ mode: 'readWrite' });
    const targetReference = { byId: target.id } as const;

    const push = await execute({
      document: SchemaPush,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          service: 'Products',
          version: 'FederationV1',
          sdl: 'type Query { product: Product } type Product @key(fields: "id") { id: ID! }',
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(push.schemaPush.error).toBeNull();
    expect(push.schemaPush.ok?.schemaRevision).toMatchObject({
      service: 'products',
      version: 'FederationV1',
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
          schema: { byVersion: 'FederationV1' },
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
          schema: { byVersion: 'MissingVersion' },
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    expect(missing.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishError',
      errors: { nodes: [{ message: "Schema version 'MissingVersion' was not found." }] },
    });
  },
);

test.concurrent('rejects a conflicting monolith revision version', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;

  await execute({
    document: SchemaPush,
    token: token.secret,
    variables: {
      input: { target: targetReference, version: 'v1', sdl: 'type Query { one: String }' },
    },
  }).then(result => result.expectNoGraphQLErrors());
  const conflict = await execute({
    document: SchemaPush,
    token: token.secret,
    variables: {
      input: { target: targetReference, version: 'v1', sdl: 'type Query { two: String }' },
    },
  }).then(result => result.expectNoGraphQLErrors());

  expect(conflict.schemaPush.ok).toBeNull();
  expect(conflict.schemaPush.error?.message).toContain(
    "Version 'v1' already exists with a different schema.",
  );
  expect(conflict.schemaPush.error?.message).toContain('Existing digest: hive-sdl-v1:sha256:');
  expect(conflict.schemaPush.error?.message).toContain('Submitted digest: hive-sdl-v1:sha256:');
});

test.concurrent('rejects a conflicting federation revision version', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const token = await createTargetAccessToken({ mode: 'readWrite' });
  const targetReference = { byId: target.id } as const;

  await execute({
    document: SchemaPush,
    token: token.secret,
    variables: {
      input: {
        target: targetReference,
        service: 'products',
        version: 'v1',
        sdl: 'type Query { one: String }',
      },
    },
  }).then(result => result.expectNoGraphQLErrors());
  const conflict = await execute({
    document: SchemaPush,
    token: token.secret,
    variables: {
      input: {
        target: targetReference,
        service: 'products',
        version: 'v1',
        sdl: 'type Query { two: String }',
      },
    },
  }).then(result => result.expectNoGraphQLErrors());

  expect(conflict.schemaPush.ok).toBeNull();
  expect(conflict.schemaPush.error?.message).toContain(
    "Version 'products@v1' already exists with a different schema.",
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

    const push = await execute({
      document: SchemaPush,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          version: 'MonolithRevision',
          sdl: 'type Query { product: String }',
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
    await execute({
      document: SchemaPublish,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          author: 'Test',
          commit: 'monolith-revision',
          schema: { byVersion: 'MonolithRevision' },
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
        version: 'MonolithRevision',
        digest: push.schemaPush.ok?.schemaRevision.digest,
      },
    });
    expect(result.target?.latestSchemaVersion?.origin).toMatchObject({
      schemaRevisionVersion: 'MonolithRevision',
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

    const push = await execute({
      document: SchemaPush,
      token: token.secret,
      variables: {
        input: {
          target: targetReference,
          service: 'products',
          version: 'FederationRevision',
          sdl: 'type Query { product: Product } type Product @key(fields: "id") { id: ID! }',
        },
      },
    }).then(result => result.expectNoGraphQLErrors());
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
          schema: { byVersion: 'FederationRevision' },
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
        version: 'FederationRevision',
        digest: push.schemaPush.ok?.schemaRevision.digest,
      },
    });
    expect(result.target?.latestSchemaVersion?.origin).toMatchObject({
      schemaRevisionVersion: null,
      publishedSubgraphs: [
        {
          name: 'products',
          schemaRevisionVersion: 'FederationRevision',
        },
      ],
    });
    expect(result.target?.latestSchemaVersion?.subgraphDiffs).toMatchObject([
      {
        subgraphVersion: {
          schemaRevisionVersion: 'FederationRevision',
        },
      },
    ]);
  },
);
