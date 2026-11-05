import { parse } from 'graphql';
import { composeServices } from '@theguild/federation-composition';
import { extractSuperGraphInformation } from './federation-super-graph';
import { createOwnershipCache, fieldCoordinatesOwnedBy } from './ownership';

function ownership() {
  const result = composeServices([
    {
      name: 'products',
      url: 'https://products.localhost/graphql',
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable"])

        enum Sort {
          ASC
          DESC
        }

        input Pagination {
          limit: Int
        }

        type Product @key(fields: "id") {
          id: ID!
          name: String!
        }

        type Query {
          products(sort: Sort, page: Pagination): [Product!]!
        }
      `),
    },
    {
      name: 'reviews',
      url: 'https://reviews.localhost/graphql',
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

        enum Sort {
          ASC
          DESC
        }

        type Product @key(fields: "id") {
          id: ID!
          reviews: [String!]!
        }

        type Query {
          search(sort: Sort): [Product!]!
        }
      `),
    },
  ]);
  if (!result.supergraphSdl) {
    throw new Error(result.errors?.map(e => e.message).join('\n'));
  }
  return extractSuperGraphInformation(parse(result.supergraphSdl));
}

describe('fieldCoordinatesOwnedBy', () => {
  test('returns only object and interface field coordinates of the subgraph', () => {
    const { coordinates, unknownSubgraphs } = fieldCoordinatesOwnedBy(ownership(), ['reviews']);
    expect(coordinates).toEqual(['Product.id', 'Product.reviews', 'Query.search']);
    expect(unknownSubgraphs).toEqual([]);
  });

  test('a shared key field belongs to every subgraph that declares it', () => {
    const products = fieldCoordinatesOwnedBy(ownership(), ['products']).coordinates;
    expect(products).toEqual(['Product.id', 'Product.name', 'Query.products']);
  });

  test('ignores type, enum value and input field ownership', () => {
    const info = ownership();
    expect(info.schemaCoordinateServicesMappings.has('Sort.ASC')).toBe(true);
    expect(info.schemaCoordinateServicesMappings.has('Pagination.limit')).toBe(true);
    expect(info.schemaCoordinateServicesMappings.has('Product')).toBe(true);
    const { coordinates } = fieldCoordinatesOwnedBy(info, ['products', 'reviews']);
    expect(coordinates).not.toContain('Sort.ASC');
    expect(coordinates).not.toContain('Pagination.limit');
    expect(coordinates).not.toContain('Product');
  });

  test('reports subgraphs that own nothing in the supergraph', () => {
    const { coordinates, unknownSubgraphs } = fieldCoordinatesOwnedBy(ownership(), [
      'reviews',
      'inventory',
    ]);
    expect(coordinates).toEqual(['Product.id', 'Product.reviews', 'Query.search']);
    expect(unknownSubgraphs).toEqual(['inventory']);
  });

  test('matches names case-insensitively and reports unknown ones as spelled', () => {
    const { coordinates, unknownSubgraphs } = fieldCoordinatesOwnedBy(ownership(), [
      'REVIEWS',
      'Inventory',
    ]);
    expect(coordinates).toEqual(['Product.id', 'Product.reviews', 'Query.search']);
    expect(unknownSubgraphs).toEqual(['Inventory']);
  });

  test('empty input resolves to nothing', () => {
    expect(fieldCoordinatesOwnedBy(ownership(), [])).toEqual({
      coordinates: [],
      unknownSubgraphs: [],
    });
  });
});

describe('createOwnershipCache', () => {
  test('evicts the oldest entry once over capacity', () => {
    const cache = createOwnershipCache<number>(2);
    cache.set('v1', 1);
    cache.set('v2', 2);
    cache.set('v3', 3);
    expect(cache.get('v1')).toBeUndefined();
    expect(cache.get('v2')).toBe(2);
    expect(cache.get('v3')).toBe(3);
  });
});
