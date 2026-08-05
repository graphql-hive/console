import { parse, print } from 'graphql';
import { composeAndValidate } from '@apollo/federation';
import { composeFederationV2 } from '../src/lib/compose';

test('patch', () => {
  const result = composeAndValidate([
    {
      typeDefs: parse(/* GraphQL */ `
        extend type Review @key(fields: "id") {
          id: String! @external
          title: String! @external
        }

        type Product @key(fields: "id") {
          id: ID!
          name: String!
          properties: Properties
          reviews: [Review] @provides(fields: "id")
        }

        type Properties {
          available: Boolean
        }

        type Query {
          randomProduct: Product
        }
      `),
      name: 'foo',
    },
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          bar: Bar
        }

        type Bar {
          id: ID!
          name: String!
        }
      `),
      name: 'bar',
    },
  ]);

  expect(result.errors!.map(e => e.message)).not.toContainEqual(
    expect.stringMatching('Unknown type "Bar"'),
  );
  expect(result.errors!.map(e => e.message)).not.toContainEqual(
    expect.stringMatching('Unknown type "Product"'),
  );
  expect(result.errors!.map(e => e.message)).toContainEqual(
    expect.stringMatching('Unknown type "Review"'),
  );
});

test('native federation formats the composed supergraph', ({ expect }) => {
  const result = composeFederationV2([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        type Product @key(fields: "id") {
          id: ID!
        }

        type Query {
          product: Product
        }
      `),
      name: 'products',
      url: 'https://products.example.com/graphql',
    },
  ]);

  expect(result.type).toBe('success');
  expect(result.result.supergraph).toMatchInlineSnapshot(`
    schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
      query: Query
    }

    directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__field(
      graph: join__Graph
      requires: join__FieldSet
      provides: join__FieldSet
      type: String
      external: Boolean
      override: String
      usedOverridden: Boolean
    ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE

    directive @join__type(
      graph: join__Graph!
      key: join__FieldSet
      extension: Boolean! = false
      resolvable: Boolean! = true
      isInterfaceObject: Boolean! = false
    ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

    directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

    scalar join__FieldSet

    directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

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
      PRODUCTS @join__graph(name: "products", url: "https://products.example.com/graphql")
    }

    type Product @join__type(graph: PRODUCTS, key: "id") {
      id: ID!
    }

    type Query @join__type(graph: PRODUCTS) {
      product: Product
    }
  `);
});
