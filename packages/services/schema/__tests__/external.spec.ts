import { print } from 'graphql';
import nock from 'nock';
import { composeExternalFederation } from '../src/lib/compose';

test('external composition sdl is transformed to a public schema if it includes supergraph SDL', async ({
  expect,
}) => {
  const http = nock('http://localhost')
    .post('/broker')
    .once()
    .reply((_, _body) => {
      const supergraphSdl = `schema @link(url: "https://specs.apollo.dev/link/v1.0") @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
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
  SECURITY
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
}`;
      const result = {
        type: 'success',
        includesException: false,
        result: {
          sdl: 'unused',
          supergraph: supergraphSdl,
        },
      };
      return [200, result];
    });

  const result = await composeExternalFederation({
    decrypt: v => v,
    external: {
      endpoint: 'http://localhost/not-important',
      encryptedSecret: 'foo',
      broker: {
        endpoint: 'http://localhost/broker',
        signature: '123',
      },
    },
    requestId: '1',
    requestTimeoutMs: 5000,
    subgraphs: [
      /** unimportant */
    ],
    transformToPublicSdl: true,
  });

  expect(result.type).toBe('success');
  assert(result.type === 'success');
  expect(result.result.sdl).toMatchInlineSnapshot(`
    type Product {
      id: ID!
    }

    type Query {
      product: Product
    }
  `);
  // ensure the AST also matches the correct SDL result
  expect(print(result.result.sdlDocumentNode)).toBe(result.result.sdl);
  http.done();
});
