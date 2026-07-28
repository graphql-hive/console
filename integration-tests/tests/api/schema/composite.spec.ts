import { schemaVersionPromote } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';

describe.each([ProjectType.Stitching, ProjectType.Federation])('$projectType', projectType => {
  test.concurrent('should insert lowercase service name to DB', async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, fetchVersions } = await createProject(projectType);
    const { publishSchema, checkSchema, deleteSchema } = await createTargetAccessToken({});

    const firstSdl = /* GraphQL */ `
      type Query {
        topProduct: Product
      }

      type Product {
        id: ID!
        name: String
      }
    `;

    await publishSchema({
      author: 'Kamil',
      commit: 'abc123',
      sdl: firstSdl,
      service: 'MyService', // PascalCase
      url: 'http://localhost:4000',
    }).then(r => r.expectNoGraphQLErrors());

    await expect(fetchVersions(2)).resolves.toHaveLength(1);

    await publishSchema({
      author: 'Kamil',
      commit: 'abc123',
      sdl: firstSdl,
      service: 'myService', // camelCase
      url: 'http://localhost:4000',
    }).then(r => r.expectNoGraphQLErrors());

    await expect(fetchVersions(2)).resolves.toHaveLength(1);

    await expect(
      checkSchema(
        firstSdl,
        'myService', // camelCase
      ).then(r => r.expectNoGraphQLErrors()),
    ).resolves.toMatchObject({
      schemaCheck: {
        __typename: 'SchemaCheckSuccess',
        valid: true,
        changes: {
          nodes: [],
          total: 0,
        },
      },
    });

    const secondSdl = /* GraphQL */ `
      type Query {
        topReview: Review
      }

      type Review {
        id: ID!
        title: String
      }
    `;

    await publishSchema({
      author: 'Kamil',
      commit: 'abc1234',
      sdl: secondSdl,
      service: 'MyOtherService', // PascalCase
      url: 'http://localhost:5000',
    }).then(r => r.expectNoGraphQLErrors());

    // We should have 2 versions (push, push)
    const versionsBeforeDelete = await fetchVersions(3);
    expect(versionsBeforeDelete).toHaveLength(2);

    expect(versionsBeforeDelete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          origin: expect.objectContaining({
            __typename: 'SchemaVersionPublishOrigin',
            publishedSubgraphs: [
              {
                name: 'myservice',
              },
            ],
          }),
        }),
        expect.objectContaining({
          origin: expect.objectContaining({
            __typename: 'SchemaVersionPublishOrigin',
            publishedSubgraphs: [
              {
                name: 'myotherservice',
              },
            ],
          }),
        }),
      ]),
    );

    await expect(
      deleteSchema(
        'myOtherService', // camelCase
      ).then(r => r.expectNoGraphQLErrors()),
    ).resolves.toEqual(
      expect.objectContaining({
        schemaDelete: expect.objectContaining({
          __typename: 'SchemaDeleteSuccess',
        }),
      }),
    );

    const versions = await fetchVersions(4);

    // We should have 3 versions (push, push, delete)
    expect(versions).toHaveLength(3);
    expect(versions[0].origin).toEqual({
      __typename: 'SchemaVersionSubgraphRemoveOrigin',
      removedSubgraphs: [{ name: 'myotherservice' }],
    });
  });
});

describe.each([ProjectType.Stitching, ProjectType.Federation])('$projectType', projectType => {
  test.concurrent(
    'should publish A, publish B, delete B, publish A and have A and B at the end',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createTargetAccessToken, fetchVersions } = await createProject(projectType);
      const { publishSchema, deleteSchema, fetchLatestValidSchema } = await createTargetAccessToken(
        {},
      );

      const serviceA = /* GraphQL */ `
        type Query {
          topProduct: Product
        }

        type Product {
          id: ID!
          name: String
        }
      `;

      const serviceB = /* GraphQL */ `
        type Query {
          topReview: Review
        }

        type Review {
          id: ID!
          title: String
        }
      `;

      await publishSchema({
        author: 'Kamil',
        commit: 'push1',
        sdl: serviceA,
        service: 'service-a',
        url: 'http://localhost:4001',
      }).then(r => r.expectNoGraphQLErrors());

      await expect(fetchVersions(2)).resolves.toHaveLength(1);

      await publishSchema({
        author: 'Kamil',
        commit: 'push2',
        sdl: serviceB,
        service: 'service-b',
        url: 'http://localhost:4002',
      }).then(r => r.expectNoGraphQLErrors());

      // We should have 2 versions (push, push)
      await expect(fetchVersions(3)).resolves.toHaveLength(2);

      await expect(deleteSchema('service-b').then(r => r.expectNoGraphQLErrors())).resolves.toEqual(
        expect.objectContaining({
          schemaDelete: expect.objectContaining({
            __typename: 'SchemaDeleteSuccess',
          }),
        }),
      );

      const versions = await fetchVersions(4);

      // We should have 3 versions (push, push, delete)
      expect(versions).toHaveLength(3);
      // Most recent version should be a delete action
      expect(versions[0].origin).toEqual({
        __typename: 'SchemaVersionSubgraphRemoveOrigin',
        removedSubgraphs: [{ name: 'service-b' }],
      });

      await publishSchema({
        author: 'Kamil',
        commit: 'push3',
        sdl: serviceB,
        service: 'service-b',
        url: 'http://localhost:4002',
      }).then(r => r.expectNoGraphQLErrors());

      // We should have 4 versions (push, push, delete, push)
      await expect(fetchVersions(5)).resolves.toHaveLength(4);

      const latestValid = await fetchLatestValidSchema();
      expect(latestValid.latestValidVersion).toBeDefined();
      expect(latestValid.latestValidVersion?.origin).toEqual({
        __typename: 'SchemaVersionPublishOrigin',
        publishedSubgraphs: [{ name: 'service-b' }],
      });
      expect(latestValid.latestValidVersion?.schemas.nodes).toHaveLength(2);
      expect(latestValid.latestValidVersion?.schemas.nodes).toContainEqual(
        expect.objectContaining({
          commit: 'push1',
        }),
      );
      expect(latestValid.latestValidVersion?.schemas.nodes).toContainEqual(
        expect.objectContaining({
          commit: 'push3',
        }),
      );
    },
  );
});

describe('Federation projects support @oneOf directive natively', () => {
  test('publish', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);
    const { publishSchema, fetchLatestValidSchema } = await createTargetAccessToken({});
    const serviceA = /* GraphQL */ `
      type Query {
        query(input: Input): Boolean
      }

      input Input @oneOf {
        id: ID
        string: String
      }
    `;

    await publishSchema({
      sdl: serviceA,
      service: 'service-a',
      url: 'http://localhost:4001',
    }).then(r => r.expectNoGraphQLErrors());

    const latestValid = await fetchLatestValidSchema();

    const supergraphSdl = latestValid.latestValidVersion?.supergraph;
    expect(supergraphSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
    expect(supergraphSdl).toContain(`input Input @join__type(graph: SERVICE_A)  @oneOf`);

    const publicSdl = latestValid.latestValidVersion?.sdl;
    expect(publicSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
    expect(publicSdl).toContain(`input Input @oneOf`);
  });

  test('check', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);
    const { publishSchema, checkSchema } = await createTargetAccessToken({});
    const serviceA = /* GraphQL */ `
      type Query {
        foo: Boolean
      }
    `;

    await publishSchema({
      sdl: serviceA,
      service: 'service-a',
      url: 'http://localhost:4001',
    }).then(r => r.expectNoGraphQLErrors());

    const serviceAOneOf = /* GraphQL */ `
      type Query {
        foo: Boolean
        query(input: Input): Boolean
      }

      input Input @oneOf {
        id: ID
        string: String
      }
    `;

    const check = await checkSchema(serviceAOneOf, 'service-a').then(r =>
      r.expectNoGraphQLErrors(),
    );

    expect(check.schemaCheck.__typename).toBe('SchemaCheckSuccess');
    if (check.schemaCheck.__typename === 'SchemaCheckSuccess') {
      expect(check.schemaCheck.schemaCheck?.__typename).toBe('SuccessfulSchemaCheck');
      if (check.schemaCheck.schemaCheck?.__typename === 'SuccessfulSchemaCheck') {
        const supergraphSdl = check.schemaCheck.schemaCheck.supergraphSDL;
        expect(supergraphSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
        expect(supergraphSdl).toContain(`input Input @join__type(graph: SERVICE_A)  @oneOf`);

        const publicSdl = check.schemaCheck.schemaCheck.compositeSchemaSDL;
        expect(publicSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
        expect(publicSdl).toContain(`input Input @oneOf`);
      }
    }
  });

  test('promotion', async () => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
    const { publishSchema, checkSchema } = await createTargetAccessToken({});
    const serviceA = /* GraphQL */ `
      type Query {
        foo: Boolean
        query(input: Input): Boolean
      }

      input Input @oneOf {
        id: ID
        string: String
      }
    `;

    await publishSchema({
      sdl: serviceA,
      service: 'service-a',
      url: 'http://localhost:4001',
    }).then(r => r.expectNoGraphQLErrors());

    const promoteResult = await schemaVersionPromote(
      {
        source: {
          fromTarget: {
            byId: target.id,
          },
        },
        target: {
          toTarget: {
            byId: target.id,
          },
        },
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    expect(promoteResult.schemaVersionPromote.ok).toBeDefined();
    if (promoteResult.schemaVersionPromote.ok) {
      const supergraphSdl = promoteResult.schemaVersionPromote.ok.newSchemaVersion.supergraph;
      expect(supergraphSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
      expect(supergraphSdl).toContain(`input Input @join__type(graph: SERVICE_A)  @oneOf`);

      const sdl = promoteResult.schemaVersionPromote.ok.newSchemaVersion.sdl;
      expect(sdl).toContain(`directive @oneOf on INPUT_OBJECT`);
      expect(sdl).toContain(`input Input @oneOf`);
    }
  });
});
