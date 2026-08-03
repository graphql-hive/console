import { AddressInfo } from 'node:net';
import { parse } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';
import { createServer } from '@hive/service-common';
import { introspect } from '../../testkit/cli';

export async function createHTTPGraphQLServer() {
  const server = await createServer({
    sentryErrorHandler: false,
    log: {
      requests: false,
      level: 'silent',
    },
    name: '',
  });

  const yoga = createYoga({
    logging: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
    }),
  });

  const yogaProtected = createYoga({
    graphqlEndpoint: '/graphql-protected',
    logging: false,
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
    }),
    plugins: [
      {
        onRequest(ctx) {
          if (ctx.request.headers.get('x-auth') !== 'AUTH_AUTH_BABY') {
            ctx.endResponse(new Response('Nah', { status: 403 }));
            return;
          }
        },
      },
    ],
  });

  const yogaFederation = createYoga({
    graphqlEndpoint: '/graphql-federation',
    logging: false,
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        extend type Query {
          me: User
          user(id: ID!): User
          users: [User]
        }

        type User @key(fields: "id") {
          id: ID!
          name: String
          username: String
        }
      `),
    }),
  });

  const yogaFederationProtected = createYoga({
    graphqlEndpoint: '/graphql-federation-protected',
    logging: false,
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        extend type Query {
          me: User
          user(id: ID!): User
          users: [User]
        }

        type User @key(fields: "id") {
          id: ID!
          name: String
          username: String
        }
      `),
    }),
    plugins: [
      {
        onRequest(ctx) {
          if (ctx.request.headers.get('x-auth') !== 'AUTH_AUTH_BABY') {
            ctx.endResponse(new Response('Nah', { status: 403 }));
            return;
          }
        },
      },
    ],
  });

  const yogaNoIntrospection = createYoga({
    logging: false,
    graphqlEndpoint: '/graphql-no-introspection',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String!
        }
      `,
    }),
    plugins: [useDisableIntrospection()],
  });

  const yogaBadService = createYoga({
    logging: false,
    graphqlEndpoint: '/graphql-bad-service',
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type _Service {
          sdl: String
        }

        type Query {
          _service: _Service
          hello: String!
        }
      `,
      resolvers: {
        Query: {
          _service: () => {
            throw new Error('Something went wrong');
          },
        },
      },
    }),
  });

  const yogaFederationNoIntrospection = createYoga({
    graphqlEndpoint: '/graphql-federation-no-introspection',
    logging: false,
    schema: buildSubgraphSchema({
      typeDefs: parse(/* GraphQL */ `
        extend type Query {
          me: User
          user(id: ID!): User
          users: [User]
        }

        type User @key(fields: "id") {
          id: ID!
          name: String
          username: String
        }
      `),
    }),
    plugins: [useDisableIntrospection()],
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yoga.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yoga.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yogaProtected.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaProtected.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yogaFederation.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaFederation.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yogaFederationProtected.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaFederationProtected.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    // Bind to the Yoga's endpoint to avoid rendering on any path
    url: yogaFederationNoIntrospection.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaFederationNoIntrospection.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    url: yogaNoIntrospection.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaNoIntrospection.handleNodeRequestAndResponse(req, reply),
  });

  server.route({
    url: yogaBadService.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: (req, reply) => yogaBadService.handleNodeRequestAndResponse(req, reply),
  });

  await server.listen({
    port: 0,
    host: '0.0.0.0',
  });

  return {
    url: 'http://localhost:' + (server.server.address() as AddressInfo).port,
    [Symbol.asyncDispose]: () => {
      server.close();
    },
  };
}

test.concurrent('can introspect monolith GraphQL service', async ({ expect }) => {
  const server = await createHTTPGraphQLServer();
  await expect(introspect([server.url + '/graphql'])).resolves.toMatchInlineSnapshot(`
    schema {
      query: Query
    }

    type Query {
      hello: String!
    }
  `);
});

test.concurrent('can introspect federation GraphQL service', async ({ expect }) => {
  const server = await createHTTPGraphQLServer();
  const url = server.url + '/graphql-federation';
  const result = await introspect([url]);
  const forceResult = await introspect(['-t', 'federation', url]);
  expect(result).toEqual(forceResult);
  expect(result).toMatchInlineSnapshot(`
    directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE

    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION

    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION

    directive @external(reason: String) on OBJECT | FIELD_DEFINITION

    directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

    directive @extends on OBJECT | INTERFACE

    type Query {
      _entities(representations: [_Any!]!): [_Entity]!
      _service: _Service!
    }

    extend type Query {
      me: User
      user(id: ID!): User
      users: [User]
    }

    type User @key(fields: "id") {
      id: ID!
      name: String
      username: String
    }

    scalar _FieldSet

    scalar _Any

    type _Service {
      sdl: String
    }

    union _Entity = User
  `);
});

test.concurrent('can introspect protected monolith with header', async ({ expect }) => {
  const server = await createHTTPGraphQLServer();
  await expect(introspect([server.url + '/graphql-protected', '-H', 'x-auth:AUTH_AUTH_BABY']))
    .resolves.toMatchInlineSnapshot(`
    schema {
      query: Query
    }

    type Query {
      hello: String!
    }
  `);
});

test.concurrent('can introspect protected federation with header', async ({ expect }) => {
  const server = await createHTTPGraphQLServer();
  await expect(
    introspect([server.url + '/graphql-federation-protected', '-H', 'x-auth:AUTH_AUTH_BABY']),
  ).resolves.toMatchInlineSnapshot(`
    directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE

    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION

    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION

    directive @external(reason: String) on OBJECT | FIELD_DEFINITION

    directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

    directive @extends on OBJECT | INTERFACE

    type Query {
      _entities(representations: [_Any!]!): [_Entity]!
      _service: _Service!
    }

    extend type Query {
      me: User
      user(id: ID!): User
      users: [User]
    }

    type User @key(fields: "id") {
      id: ID!
      name: String
      username: String
    }

    scalar _FieldSet

    scalar _Any

    type _Service {
      sdl: String
    }

    union _Entity = User
  `);
});

test.concurrent(
  'error handling on server with introspection is disabled and _service does not respond',
  async ({ expect }) => {
    const server = await createHTTPGraphQLServer();
    const command = introspect([server.url + '/graphql-no-introspection']);
    await expect(command).rejects.toThrow('Could not get introspection result from the service.');
    await expect(command).rejects.toThrow('[116]');
    await expect(command).rejects.not.toThrow('[115]');
  },
);

test.concurrent(
  'can introspect federated service even if introspection is disabled',
  async ({ expect }) => {
    const server = await createHTTPGraphQLServer();
    const command = introspect([server.url + '/graphql-federation-no-introspection']);

    await expect(command).resolves.toContain('type Query {');
  },
);

test.concurrent('error is thrown when _service exists but fails', async ({ expect }) => {
  const server = await createHTTPGraphQLServer();
  const command = introspect([server.url + '/graphql-bad-service']);

  await expect(command).rejects.toThrow('Could not get introspection result from the service.');
  await expect(command).rejects.toThrow('[116]');
  await expect(command).rejects.not.toThrow('[115]');
});

test.concurrent(
  'federation can be introspected when explicitly defined even if introspection is disabled',
  async ({ expect }) => {
    const server = await createHTTPGraphQLServer();
    const command = introspect([
      server.url + '/graphql-federation-no-introspection',
      '--type',
      'federation',
    ]);

    await expect(command).resolves.toContain('type Query {');
  },
);
