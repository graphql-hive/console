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

test('native federation formats the composed supergraph', () => {
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
  if (result.type === 'success') {
    expect(result.result.supergraph).toBe(print(parse(result.result.supergraph)));
  }
});
