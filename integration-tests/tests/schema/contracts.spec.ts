import { getServiceHost } from 'testkit/utils';
import type { SchemaBuilderApi } from '@hive/schema';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

const host =
  process.env['SCHEMA_SERVICE_HOST_OVERRIDE'] ||
  (await getServiceHost('schema', 3002).then(r => `http://${r}`));

const client = createTRPCProxyClient<SchemaBuilderApi>({
  links: [
    httpLink({
      url: host + `/trpc`,
      fetch,
    }),
  ],
});

describe('schema service can process contracts', () => {
  test('single', async () => {
    const result = await client.composeAndValidate.mutate({
      type: 'federation',
      native: true,
      schemas: [
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

            type Query {
              hello: String
              helloHidden: String @tag(name: "toyota")
            }
          `,
          source: 'foo.graphql',
          url: null,
        },
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

            type Query {
              bar: String
              barHidden: String @tag(name: "toyota")
            }
          `,
          source: 'bar.graphql',
          url: null,
        },
      ],
      external: null,
      contracts: [
        {
          id: 'foo',
          filter: {
            include: null,
            exclude: ['toyota'],
            removeUnreachableTypesFromPublicApiSchema: false,
          },
        },
      ],
    });

    expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
      type Query {
        bar: String
        hello: String
      }
  `);
  });

  test('multiple', async () => {
    const result = await client.composeAndValidate.mutate({
      type: 'federation',
      native: true,
      schemas: [
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

            type Query {
              hello: String
              helloHidden: String @tag(name: "toyota")
            }
          `,
          source: 'foo.graphql',
          url: null,
        },
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

            type Query {
              bar: String
              barHidden: String @tag(name: "toyota")
            }
          `,
          source: 'bar.graphql',
          url: null,
        },
      ],
      external: null,
      contracts: [
        {
          id: 'foo',
          filter: {
            include: null,
            exclude: ['toyota'],
            removeUnreachableTypesFromPublicApiSchema: false,
          },
        },
        {
          id: 'bar',
          filter: {
            include: ['toyota'],
            exclude: null,
            removeUnreachableTypesFromPublicApiSchema: false,
          },
        },
      ],
    });

    expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
      type Query {
        bar: String
        hello: String
      }
    `);
    expect(result.contracts?.[1].sdl).toMatchInlineSnapshot(`
      type Query {
        barHidden: String
        helloHidden: String
      }
    `);
  });

  test('remove unreachable types from public schema', async () => {
    const result = await client.composeAndValidate.mutate({
      type: 'federation',
      native: true,
      schemas: [
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

            type Query {
              hello: String
              helloHidden: Toyota @tag(name: "toyota")
            }

            type Toyota {
              id: String!
            }
          `,
          source: 'foo.graphql',
          url: null,
        },
      ],
      external: null,
      contracts: [
        {
          id: 'foo',
          filter: {
            include: null,
            exclude: ['toyota'],
            removeUnreachableTypesFromPublicApiSchema: true,
          },
        },
      ],
    });

    expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
      type Query {
        hello: String
      }
    `);
  });

  test('keep unreachable types from public schema', async () => {
    const result = await client.composeAndValidate.mutate({
      type: 'federation',
      native: true,
      schemas: [
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])
            type Query {
              hello: String
              helloHidden: Toyota @tag(name: "toyota")
            }
            type Toyota {
              id: String!
            }
          `,
          source: 'foo.graphql',
          url: null,
        },
      ],
      external: null,
      contracts: [
        {
          id: 'foo',
          filter: {
            include: null,
            exclude: ['toyota'],
            removeUnreachableTypesFromPublicApiSchema: false,
          },
        },
      ],
    });

    expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
      type Query {
        hello: String
      }

      type Toyota {
        id: String!
      }
    `);

    // there should be no @inaccessible on federation specific types otherwise apollo router goes brrrt
    expect(result.contracts?.[0].supergraph).toContain('enum join__Graph {');
    expect(result.contracts?.[0].supergraph).toContain('scalar link__Import\n');
    expect(result.contracts?.[0].supergraph).toContain('scalar join__FieldSet\n');
  });
});

test('federation schema contains list of tags', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

          type Query {
            hello: String
            helloHidden: String @tag(name: "toyota") @tag(name: "turtle")
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          include: null,
          exclude: ['toyota'],
          removeUnreachableTypesFromPublicApiSchema: false,
        },
      },
    ],
  });
  expect(result.tags).toMatchInlineSnapshot(`
    [
      toyota,
      turtle,
    ]
  `);
});

test('nothing is removed from schema as everything is included yields no errors', async () => {
  await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

          type Query {
            hello: String @tag(name: "toyota")
            helloHidden: String @tag(name: "toyota")
            foo: String @tag(name: "toyota")
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          include: ['toyota'],
          exclude: null,
          removeUnreachableTypesFromPublicApiSchema: true,
        },
      },
    ],
  });
});

test('failed contract composition has errors and no sdl and supergraph', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

          type Query {
            hello: String @tag(name: "toyota")
            helloHidden: String @tag(name: "toyota")
            bar: String @tag(name: "toyota")
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: true,
          exclude: ['toyota'],
          include: null,
        },
      },
    ],
  });
  expect(result.contracts?.[0].sdl).toEqual(null);
  expect(result.contracts?.[0].supergraph).toEqual(null);
  expect(result.contracts?.[0].errors).toBeDefined();
});

test('type is marked as inaccessible if all fields are inaccessible and the type is not used', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@tag"])

          type Query {
            hello: String @tag(name: "public")
          }

          type Brr {
            a: String
            b: String
            c: String
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: true,
          exclude: null,
          include: ['public'],
        },
      },
    ],
  });

  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].supergraph).toContain(
    'type Brr @join__type(graph: FOO_GRAPHQL) @inaccessible {',
  );
});

test('inaccessible is only applied once per type', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@tag"])

          type Query {
            hello: String @tag(name: "public")
          }

          type Brr {
            a: String
          }

          extend type Brr {
            b: String
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: true,
          exclude: null,
          include: ['public'],
        },
      },
    ],
  });

  expect(result.contracts?.[0].errors).toEqual([]);
});

test('inaccessible is not applied on type if at least one type extension has a public field', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@tag"])

          type Query {
            hello: String @tag(name: "public")
          }

          type Brr {
            a: String
          }

          extend type Brr {
            b: String @tag(name: "public")
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: false,
          exclude: null,
          include: ['public'],
        },
      },
    ],
  });

  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].sdl).toContain('type Brr {');
});

test('@external fields are always included if exclude @tag is used', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@key", "@tag"])

          type Query {
            user: User
          }

          type User @key(fields: "id") {
            id: ID!
            ssn: String @tag(name: "private")
          }
        `,
        source: 'user.graphql',
        url: 'https://localhost:3000/graphql',
      },
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(
              url: "https://specs.apollo.dev/federation/v2.8"
              import: ["@key", "@external", "@requires"]
            )

          type User @key(fields: "id") {
            id: ID!
            ssn: String @external
            creditScore: Int @requires(fields: "ssn")
          }
        `,
        source: 'credit.graphql',
        url: 'https://localhost:3001/graphql',
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: false,
          exclude: ['private'],
          include: null,
        },
      },
    ],
  });

  expect(result.errors).toEqual([]);
  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
    type User {
      id: ID!
      creditScore: Int
    }

    type Query {
      user: User
    }
  `);
});

test('@external fields are always included if include @tag is used', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@key", "@tag"])

          type Query {
            user: User @tag(name: "public")
          }

          type User @key(fields: "id") {
            id: ID! @tag(name: "public")
            ssn: String
          }
        `,
        source: 'user.graphql',
        url: 'https://localhost:3000/graphql',
      },
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(
              url: "https://specs.apollo.dev/federation/v2.8"
              import: ["@key", "@external", "@requires", "@tag"]
            )

          type User @key(fields: "id") {
            id: ID!
            ssn: String @external
            creditScore: Int @requires(fields: "ssn") @tag(name: "public")
          }
        `,
        source: 'credit.graphql',
        url: 'https://localhost:3001/graphql',
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: false,
          exclude: null,
          include: ['public'],
        },
      },
    ],
  });

  expect(result.errors).toEqual([]);
  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
    type User {
      id: ID!
      creditScore: Int
    }

    type Query {
      user: User
    }
  `);
});

test(`@external object's fields are do not have contract tag applied`, async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@key", "@tag"])

          type Query {
            user: User @tag(name: "public")
          }

          type User @key(fields: "id") {
            id: ID! @tag(name: "public")
            ssn: String
          }
        `,
        source: 'user.graphql',
        url: 'https://localhost:3000/graphql',
      },
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(
              url: "https://specs.apollo.dev/federation/v2.8"
              import: ["@key", "@external", "@requires", "@tag"]
            )

          extend type User @external {
            ssn: String
          }

          type User @key(fields: "id") {
            id: ID!
            creditScore: Int @requires(fields: "ssn") @tag(name: "public")
          }
        `,
        source: 'credit.graphql',
        url: 'https://localhost:3001/graphql',
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: false,
          exclude: null,
          include: ['public'],
        },
      },
    ],
  });
  expect(result.errors).toEqual([]);
  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
    type User {
      id: ID!
      creditScore: Int
    }

    type Query {
      user: User
    }
  `);
});

test('include with exclude is possible', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.8", import: ["@key", "@tag"])

          type Query {
            user: User @tag(name: "public")
          }

          type User @key(fields: "id") @tag(name: "public") {
            id: ID!
            ssn: String @tag(name: "private")
          }
        `,
        source: 'user.graphql',
        url: 'https://localhost:3000/graphql',
      },
    ],
    external: null,
    contracts: [
      {
        id: 'foo',
        filter: {
          removeUnreachableTypesFromPublicApiSchema: false,
          exclude: ['private'],
          include: ['public'],
        },
      },
    ],
  });

  expect(result.errors).toEqual([]);
  expect(result.contracts?.[0].errors).toEqual([]);
  expect(result.contracts?.[0].sdl).toMatchInlineSnapshot(`
    type Query {
      user: User
    }

    type User {
      id: ID!
    }
  `);
});
