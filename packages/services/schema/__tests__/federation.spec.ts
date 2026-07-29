import { parse } from 'graphql';
import { composeAndValidate } from '@apollo/federation';
import { composeServices as hiveComposeAndValidate } from '@theguild/federation-composition';

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

test('oneOf directive', async () => {
  const serviceA = /* GraphQL */ `
    type Query {
      query(input: Input): Boolean
    }

    input Input @oneOf {
      id: ID
      string: String
    }
  `;

  const result = await hiveComposeAndValidate([
    {
      typeDefs: parse(serviceA),
      name: 'service-a',
      url: 'http://localhost:4001',
    },
  ]);

  expect(result.errors).toBeUndefined();
  // if condition for typing
  if (result.errors === undefined) {
    expect(result.supergraphSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
    expect(result.supergraphSdl).toContain(`input Input @join__type(graph: SERVICE_A)  @oneOf`);

    expect(result.publicSdl).toContain(`directive @oneOf on INPUT_OBJECT`);
    expect(result.publicSdl).toContain(`input Input @oneOf`);
  }
});
