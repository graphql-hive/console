import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';

test.concurrent('graph variant publish can not be done for single project', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Single);

  const token = await createTargetAccessToken({});

  const result = await token
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
      variant: 'variant-a',
    })
    .then(res => res.expectNoGraphQLErrors());
  expect(result.schemaPublish).toMatchObject({
    __typename: 'SchemaPublishError',
    errors: {
      nodes: [
        {
          message: 'Publishing a to a graph variant is only supported for Federation projects.',
        },
      ],
    },
  });
});

test.concurrent(
  'graph variant publish can not be done for stitching project',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Stitching);

    const token = await createTargetAccessToken({});

    const result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'b',
        variant: 'variant-a',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish).toMatchObject({
      __typename: 'SchemaPublishError',
      errors: {
        nodes: [
          {
            message: 'Publishing a to a graph variant is only supported for Federation projects.',
          },
        ],
      },
    });
  },
);

test.concurrent('graph variant name must be at least 3 characters long', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Federation);

  const token = await createTargetAccessToken({});

  function publish(variantName: string) {
    return token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'http://a',
        variant: variantName,
      })
      .then(res => res.expectNoGraphQLErrors());
  }

  let result = await publish('aa');
  expect(result.schemaPublish).toMatchObject({
    __typename: 'SchemaPublishError',
    errors: {
      nodes: [
        {
          message: 'Invalid variant name provided. Must be at least 3 character long.',
        },
      ],
    },
  });
  result = await publish('aaa');
  expect(result.schemaPublish.__typename).toEqual('SchemaPublishSuccess');
});

test.concurrent('graph variant name must be at most 64 characters long', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Federation);

  const token = await createTargetAccessToken({});

  function publish(variantName: string) {
    return token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'http://a',
        variant: variantName,
      })
      .then(res => res.expectNoGraphQLErrors());
  }

  let result = await publish(new Array(65).fill('a').join(''));
  expect(result.schemaPublish).toMatchObject({
    __typename: 'SchemaPublishError',
    errors: {
      nodes: [
        {
          message: 'Invalid variant name provided. Must be at most 64 characters long.',
        },
      ],
    },
  });
  result = await publish(new Array(64).fill('a').join(''));
  expect(result.schemaPublish.__typename).toEqual('SchemaPublishSuccess');
});

test.concurrent('graph variant publish (empty target)', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Federation);

  const token = await createTargetAccessToken({});

  let result = await token
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
      service: 'a',
      url: 'http://a.service',
      variant: 'variant-a',
    })
    .then(res => res.expectNoGraphQLErrors());
  expect(result.schemaPublish.__typename).toEqual(`SchemaPublishSuccess`);

  await token
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          b: String
        }
      `,
      service: 'b',
      url: 'http://b.service',
      variant: 'variant-a',
    })
    .then(res => res.expectNoGraphQLErrors());
  expect(result.schemaPublish.__typename).toEqual(`SchemaPublishSuccess`);

  // TODO: query graph variant versions
});

test.concurrent('graph variants are limited to 3 per target', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Federation);

  const token = await createTargetAccessToken({});

  function publish(variantName: string) {
    return token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'http://a',
        variant: variantName,
      })
      .then(res => res.expectNoGraphQLErrors());
  }

  let result = await publish('variant-1');
  expect(result.schemaPublish).toMatchObject({
    __typename: `SchemaPublishSuccess`,
  });
  result = await publish('variant-2');
  expect(result.schemaPublish).toMatchObject({
    __typename: `SchemaPublishSuccess`,
  });
  result = await publish('variant-3');
  expect(result.schemaPublish).toMatchObject({
    __typename: `SchemaPublishSuccess`,
  });
  result = await publish('variant-4');
  expect(result.schemaPublish).toMatchObject({
    __typename: 'SchemaPublishError',
    errors: {
      nodes: [
        {
          message: 'The maximum amount of graph variants for this target has been exceeded.',
        },
      ],
    },
  });
});

test.concurrent('graph variant publish (default graph exists in target)', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { createTargetAccessToken } = await createProject(ProjectType.Federation);

  const token = await createTargetAccessToken({});

  let result = await token
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          a: String
        }
      `,
      service: 'a',
      url: 'http://a.service',
    })
    .then(res => res.expectNoGraphQLErrors());
  expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

  result = await token
    .publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          b: String
        }
      `,
      service: 'b',
      url: 'http://a.service',
      variant: 'variant-b',
    })
    .then(res => res.expectNoGraphQLErrors());

  // TODO: query graph variant versions and verify that it is composed of the default schema and variant schema
});

test.concurrent(
  'publishing the default graph updates the variant graph if the service is not overriden',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);

    const token = await createTargetAccessToken({});

    let result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'http://a.service',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        service: 'b',
        url: 'http://a.service',
        variant: 'variant-b',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            c: String
          }
        `,
        service: 'c',
        url: 'http://c.service',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    // TODO: verify that
    // default Graph has A and C
    // variant Graph has A B and C
  },
);

test.concurrent(
  'publishing a service to the default graph that is overwritten in a variant does not result in a new variant graph version',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);

    const token = await createTargetAccessToken({});

    let result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            a: String
          }
        `,
        service: 'a',
        url: 'http://a.service',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        service: 'b',
        url: 'http://b.service',
        variant: 'variant-b',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            bb: String
          }
        `,
        service: 'b',
        url: 'http://b.service',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);
  },
);

test.concurrent(
  'publishing the same service to the same graph variant results in an ignore (no new graph variant version published)',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);

    const token = await createTargetAccessToken({});

    let result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        service: 'b',
        url: 'http://b.service',
        variant: 'variant-b',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);

    await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        service: 'b',
        url: 'http://b.service',
        variant: 'variant-b',
        author: 'davinci-pls-bypass-the-cache',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishSuccess`);
  },
);

test.concurrent(
  'publish with missing url results in rejected schema publish',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken } = await createProject(ProjectType.Federation);

    const token = await createTargetAccessToken({});

    let result = await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            b: String
          }
        `,
        service: 'b',
        variant: 'variant-b',
      })
      .then(res => res.expectNoGraphQLErrors());
    expect(result.schemaPublish.__typename).toMatchInlineSnapshot(`SchemaPublishMissingUrlError`);
  },
);
