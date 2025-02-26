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

describe('schema service can process metadata', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.3")
            @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
            @meta(name: "schema", content: "user")

          directive @meta(
            name: String!
            content: String!
          ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

          type Query {
            user: User @meta(name: "field", content: "user")
          }

          type User @meta(name: "type", content: "user") {
            id: ID!
            name: String @meta(name: "field", content: "User.name")
          }
        `,
        source: 'user.graphql',
        url: null,
      },
      {
        raw: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.1")
            @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
            @meta(name: "schema", content: "foo")

          directive @meta(
            name: String!
            content: String!
          ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

          type Query {
            foo: String
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
    ],
    external: null,
    contracts: null,
  });

  test('@meta does not need to be in supergraph', () => {
    expect(result.supergraph).toMatchInlineSnapshot(`
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        
        
        
        
        
        @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"]) 
      {
        query: Query
        
        
      }


        directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

        directive @join__field(
          graph: join__Graph
          requires: join__FieldSet
          provides: join__FieldSet
          type: String
          external: Boolean
          override: String
          usedOverridden: Boolean
        ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

        directive @join__graph(name: String!, url: String!) on ENUM_VALUE

        directive @join__implements(
          graph: join__Graph!
          interface: String!
        ) repeatable on OBJECT | INTERFACE

        directive @join__type(
          graph: join__Graph!
          key: join__FieldSet
          extension: Boolean! = false
          resolvable: Boolean! = true
          isInterfaceObject: Boolean! = false
        ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

        directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

        scalar join__FieldSet


        directive @link(
          url: String
          as: String
          for: link__Purpose
          import: [link__Import]
        ) repeatable on SCHEMA

        scalar link__Import

        enum link__Purpose {
          """
          \`SECURITY\` features provide metadata necessary to securely resolve fields.
          """
          SECURITY

          """
          \`EXECUTION\` features provide metadata necessary for operation execution.
          """
          EXECUTION
        }







      enum join__Graph {
        FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "") 
        USER_GRAPHQL @join__graph(name: "user.graphql", url: "") 
      }

      type Query @join__type(graph: FOO_GRAPHQL)  @join__type(graph: USER_GRAPHQL)  {
        foo: String @join__field(graph: FOO_GRAPHQL) 
        user: User @join__field(graph: USER_GRAPHQL) 
      }

      type User @join__type(graph: USER_GRAPHQL)  {
        id: ID!
        name: String
      }
    `);
  });

  test('metadata is a union from schema, type, and field @meta', () => {
    expect(result.schemaMetadata).toMatchInlineSnapshot(`
      {
        Query.foo: [
          {
            content: foo,
            name: schema,
            source: foo.graphql,
          },
        ],
        Query.user: [
          {
            content: user,
            name: field,
            source: user.graphql,
          },
          {
            content: user,
            name: schema,
            source: user.graphql,
          },
        ],
        User.id: [
          {
            content: user,
            name: type,
            source: user.graphql,
          },
          {
            content: user,
            name: schema,
            source: user.graphql,
          },
        ],
        User.name: [
          {
            content: User.name,
            name: field,
            source: user.graphql,
          },
          {
            content: user,
            name: type,
            source: user.graphql,
          },
          {
            content: user,
            name: schema,
            source: user.graphql,
          },
        ],
      }
    `);
  });

  test('metadataAttributes includes all used metadata names and content', () => {
    expect(result.metadataAttributes).toMatchInlineSnapshot(`
      {
        field: [
          user,
          User.name,
        ],
        schema: [
          user,
          foo,
        ],
        type: [
          user,
        ],
      }
    `);
  });
});
