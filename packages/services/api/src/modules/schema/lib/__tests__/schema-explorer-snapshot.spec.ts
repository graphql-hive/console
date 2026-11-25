import { parse } from 'graphql';
import { composeServices } from '@theguild/federation-composition';
import {
  buildSchemaExplorerSnapshot,
  getEntry,
  getTypeEntities,
  getTypeEntity,
  type SchemaExplorerSnapshot,
} from '../schema-explorer-snapshot.js';

function compose() {
  const result = composeServices([
    {
      name: 'products',
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
        type Query {
          product(id: ID!): Product
        }
        type Product @key(fields: "id") {
          id: ID!
          name: String @deprecated(reason: "use title")
          category: Category
        }
        enum Category {
          A
          B
        }
      `),
    },
    {
      name: 'reviews',
      typeDefs: parse(/* GraphQL */ `
        extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])
        type Product @key(fields: "id") {
          id: ID!
          reviews(first: Int = 10): [Review!]!
        }
        type Review {
          body: String
        }
        type Mutation {
          addReview(input: AddReviewInput!): Review
        }
        input AddReviewInput {
          body: String!
        }
        union SearchResult = Review
      `),
    },
  ]);
  if (result.errors?.length) {
    throw result.errors[0];
  }
  return buildSchemaExplorerSnapshot(parse(result.publicSdl!), parse(result.supergraphSdl!));
}

/** What the cache hands out: the snapshot after a JSON round trip. */
function fromCache(snapshot: SchemaExplorerSnapshot): SchemaExplorerSnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

test('entries are keyed by schema coordinate and point to their children', () => {
  const snapshot = fromCache(compose());

  expect(getEntry(snapshot, 'Product')).toMatchObject({
    kind: 'ObjectTypeDefinition',
    fields: ['Product.id', 'Product.name', 'Product.category', 'Product.reviews'],
    ownedBy: expect.arrayContaining(['products', 'reviews']),
  });
  expect(getEntry(snapshot, 'Product.reviews')).toEqual({
    kind: 'FieldDefinition',
    type: '[Review!]!',
    args: ['Product.reviews.first'],
    ownedBy: ['reviews'],
  });
  expect(getEntry(snapshot, 'Product.reviews.first')).toEqual({
    kind: 'InputValueDefinition',
    type: 'Int',
    defaultValue: 10,
  });
  expect(getEntry(snapshot, 'Product.name')).toMatchObject({
    deprecationReason: 'use title',
    ownedBy: ['products'],
  });
  expect(getEntry(snapshot, 'Category')).toMatchObject({ values: ['Category.A', 'Category.B'] });
  expect(getEntry(snapshot, 'SearchResult')).toMatchObject({ members: ['Review'] });
  expect(getEntry(snapshot, 'Product.unknown')).toBe(null);
});

test('types, roots and subgraph names', () => {
  const snapshot = fromCache(compose());

  expect(snapshot.types).toEqual([...snapshot.types].sort((a, b) => a.localeCompare(b)));
  expect(snapshot.types.some(name => name.startsWith('__'))).toBe(false);
  expect(snapshot.queryTypeName).toBe('Query');
  expect(snapshot.mutationTypeName).toBe('Mutation');
  expect(snapshot.subscriptionTypeName).toBe(null);
  expect(snapshot.subgraphNames).toEqual(['products', 'reviews']);
  // Product.name is deprecated.
  expect(snapshot.deprecatedTypes).toEqual(['Product']);
});

test('deprecatedTypes covers deprecated fields, arguments, enum values and input fields', () => {
  const snapshot = buildSchemaExplorerSnapshot(
    parse(/* GraphQL */ `
      type Query {
        a(old: Int @deprecated): Int
        b: Int
        c: Iface
      }
      interface Iface {
        x: Int @deprecated
      }
      type Clean {
        y: Int
      }
      enum E {
        A
        B @deprecated
      }
      enum CleanEnum {
        C
      }
      input In {
        z: Int @deprecated
      }
      input CleanInput {
        w: Int
      }
      union U = Clean
    `),
    null,
  );
  expect(snapshot.deprecatedTypes).toEqual(['E', 'Iface', 'In', 'Query']);
});

test('types are assembled from their entries', () => {
  const snapshot = fromCache(compose());

  expect(getTypeEntity(snapshot, 'Product')).toEqual({
    kind: 'ObjectTypeDefinition',
    name: 'Product',
    interfaces: [],
    fields: [
      { name: 'id', type: 'ID!', args: [] },
      { name: 'name', type: 'String', deprecationReason: 'use title', args: [] },
      { name: 'category', type: 'Category', args: [] },
      {
        name: 'reviews',
        type: '[Review!]!',
        args: [{ name: 'first', type: 'Int', defaultValue: 10 }],
      },
    ],
  });
  // A field coordinate is not a type.
  expect(getTypeEntity(snapshot, 'Product.reviews')).toBe(null);
});

test('built-in scalars are flagged and can be left out', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(parse(`type Query { a: String, d: Date } scalar Date`), null),
  );

  expect(getEntry(snapshot, 'String')).toMatchObject({ builtIn: true });
  expect(getEntry(snapshot, 'Date')).not.toHaveProperty('builtIn');
  expect(getTypeEntities(snapshot, { withBuiltInScalars: true }).map(t => t.name)).toEqual([
    'Boolean',
    'Date',
    'Query',
    'String',
  ]);
  expect(getTypeEntities(snapshot, { withBuiltInScalars: false }).map(t => t.name)).toEqual([
    'Date',
    'Query',
  ]);
  expect(snapshot.subgraphNames).toEqual([]);
});

test('default values are coerced, including nested input object defaults', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(
      parse(/* GraphQL */ `
        type Query {
          f(i: I = { a: 2 }, e: E = B, s: String = null, l: [Int] = [1, 2], none: Int): Int
        }
        input I {
          a: Int = 1
          e: E = A
        }
        enum E {
          A
          B
        }
      `),
      null,
    ),
  );

  expect(getEntry(snapshot, 'Query.f.i')).toMatchObject({ defaultValue: { a: 2, e: 'A' } });
  expect(getEntry(snapshot, 'Query.f.e')).toMatchObject({ defaultValue: 'B' });
  expect(getEntry(snapshot, 'Query.f.s')).toMatchObject({ defaultValue: null });
  expect(getEntry(snapshot, 'Query.f.l')).toMatchObject({ defaultValue: [1, 2] });
  expect(getEntry(snapshot, 'Query.f.none')).not.toHaveProperty('defaultValue');
  expect(getEntry(snapshot, 'I.a')).toMatchObject({ defaultValue: 1 });
});

test('Object.prototype keys are not entries', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(parse(`type Query { constructor: String }`), null),
  );

  expect(getEntry(snapshot, 'constructor')).toBe(null);
  expect(getTypeEntity(snapshot, 'toString')).toBe(null);
  expect(getEntry(snapshot, 'Query.constructor')).toMatchObject({ type: 'String' });
});
