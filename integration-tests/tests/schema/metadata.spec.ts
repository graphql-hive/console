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

describe('schema service can process metadata', () => {
  test('multiple', async () => {
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
              @federation__composeDirective(name: "@meta")
              @meta(name: "owner", content: "hive-team")

            directive @meta(
              name: String!
              content: String!
            ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

            type Query {
              hello: String
            }
          `,
          source: 'foo.graphql',
          url: null,
        },
        {
          raw: /* GraphQL */ `
            extend schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/federation/v2.0")

            type Query {
              bar: String
            }
          `,
          source: 'bar.graphql',
          url: null,
        },
      ],
      external: null,
      contracts: null,
    });

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
        BAR_GRAPHQL @join__graph(name: "bar.graphql", url: "") 
        FOO_GRAPHQL @join__graph(name: "foo.graphql", url: "") 
      }

      directive @meta(name: String!, content: String!)  repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

      type Query @join__type(graph: BAR_GRAPHQL)  @join__type(graph: FOO_GRAPHQL)  {
        bar: String @join__field(graph: BAR_GRAPHQL) 
        hello: String @meta(name: "owner", content: "hive-team")  @join__field(graph: FOO_GRAPHQL) 
      }
    `);
  });
});
