import { parse } from 'graphql';
import { composeServices } from '@theguild/federation-composition';
import {
  encodeSchemaExplorerSnapshot,
  SchemaExplorerSnapshotReader,
} from '../schema-explorer-flat-snapshot.js';
import {
  buildSchemaExplorerSnapshot,
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

/** What the cache hands out: a reader of the encoded snapshot. */
function fromCache(snapshot: SchemaExplorerSnapshot): SchemaExplorerSnapshotReader {
  return SchemaExplorerSnapshotReader.fromBuffer(encodeSchemaExplorerSnapshot(snapshot))!;
}

test('entries are keyed by schema coordinate and point to their children', () => {
  const snapshot = fromCache(compose());

  expect(snapshot.getEntry('Product')).toMatchObject({
    kind: 'ObjectTypeDefinition',
    fields: ['Product.id', 'Product.name', 'Product.category', 'Product.reviews'],
    ownedBy: expect.arrayContaining(['products', 'reviews']),
  });
  expect(snapshot.getEntry('Product.reviews')).toEqual({
    kind: 'FieldDefinition',
    type: '[Review!]!',
    args: ['Product.reviews.first'],
    ownedBy: ['reviews'],
  });
  expect(snapshot.getEntry('Product.reviews.first')).toEqual({
    kind: 'InputValueDefinition',
    type: 'Int',
    defaultValue: 10,
  });
  expect(snapshot.getEntry('Product.name')).toMatchObject({
    deprecationReason: 'use title',
    ownedBy: ['products'],
  });
  expect(snapshot.getEntry('Category')).toMatchObject({ values: ['Category.A', 'Category.B'] });
  expect(snapshot.getEntry('SearchResult')).toMatchObject({ members: ['Review'] });
  expect(snapshot.getEntry('Product.unknown')).toBe(null);
});

test('types, roots and subgraph names', () => {
  const snapshot = fromCache(compose());

  const types = snapshot.getTypeNames({ withBuiltInScalars: true });
  expect(types).toEqual([...types].sort((a, b) => a.localeCompare(b)));
  expect(types.some(name => name.startsWith('__'))).toBe(false);
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

  expect(snapshot.getTypeEntity('Product')).toEqual({
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
  expect(snapshot.getTypeEntity('Product.reviews')).toBe(null);
});

test('built-in scalars are flagged and can be left out', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(parse(`type Query { a: String, d: Date } scalar Date`), null),
  );

  expect(snapshot.getEntry('String')).toMatchObject({ builtIn: true });
  expect(snapshot.getEntry('Date')).not.toHaveProperty('builtIn');
  expect(
    snapshot.getTypeEntities(snapshot.getTypeNames({ withBuiltInScalars: true })).map(t => t.name),
  ).toEqual(['Boolean', 'Date', 'Query', 'String']);
  expect(
    snapshot.getTypeEntities(snapshot.getTypeNames({ withBuiltInScalars: false })).map(t => t.name),
  ).toEqual(['Date', 'Query']);
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

  expect(snapshot.getEntry('Query.f.i')).toMatchObject({ defaultValue: { a: 2, e: 'A' } });
  expect(snapshot.getEntry('Query.f.e')).toMatchObject({ defaultValue: 'B' });
  expect(snapshot.getEntry('Query.f.s')).toMatchObject({ defaultValue: null });
  expect(snapshot.getEntry('Query.f.l')).toMatchObject({ defaultValue: [1, 2] });
  expect(snapshot.getEntry('Query.f.none')).not.toHaveProperty('defaultValue');
  expect(snapshot.getEntry('I.a')).toMatchObject({ defaultValue: 1 });
});

test('Object.prototype keys are not entries', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(parse(`type Query { constructor: String }`), null),
  );

  expect(snapshot.getEntry('constructor')).toBe(null);
  expect(snapshot.getTypeEntity('toString')).toBe(null);
  expect(snapshot.getEntry('Query.constructor')).toMatchObject({ type: 'String' });
});

test('ownership of types comes from the header, of other coordinates from their entries', () => {
  const snapshot = fromCache(compose());

  expect(snapshot.getOwnedBy('Product')?.sort()).toEqual(['products', 'reviews']);
  expect(snapshot.getOwnedBy('Product.reviews')).toEqual(['reviews']);
  expect(snapshot.getOwnedBy('Product.reviews.first')).toBe(null);
  expect(snapshot.getOwnedBy('Unknown')).toBe(null);
  expect(snapshot.getOwnedBy('Unknown.field')).toBe(null);
});

test('reading a buffer of another format returns null', () => {
  const buffer = encodeSchemaExplorerSnapshot(compose());
  expect(SchemaExplorerSnapshotReader.fromBuffer(buffer)).not.toBe(null);

  const otherVersion = Buffer.from(buffer);
  otherVersion.writeUInt8(otherVersion.readUInt8(3) + 1, 3);
  expect(SchemaExplorerSnapshotReader.fromBuffer(otherVersion)).toBe(null);
  expect(SchemaExplorerSnapshotReader.fromBuffer(Buffer.from('{"coordinates":{}}'))).toBe(null);
  expect(SchemaExplorerSnapshotReader.fromBuffer(Buffer.alloc(0))).toBe(null);
});

test('non-ASCII descriptions survive the byte offsets', () => {
  const snapshot = fromCache(
    buildSchemaExplorerSnapshot(
      parse(/* GraphQL */ `
        "Über 🚀 café"
        type Query {
          "naïve ✓"
          a: String
          b: Unicode
        }
        "日本語"
        type Unicode {
          x: Int
        }
      `),
      null,
    ),
  );

  expect(snapshot.getTypeEntity('Query')).toMatchObject({
    description: 'Über 🚀 café',
    fields: [{ name: 'a', description: 'naïve ✓' }, { name: 'b' }],
  });
  expect(snapshot.getTypeEntity('Unicode')).toMatchObject({ description: '日本語' });
});

describe('getLazyTypeEntity', () => {
  test('equals the assembled type for every type', () => {
    const snapshot = fromCache(compose());
    const properties = ['kind', 'name', 'description', 'interfaces', 'fields', 'values', 'members'];
    for (const typename of snapshot.getTypeNames({ withBuiltInScalars: true })) {
      const lazy = snapshot.getLazyTypeEntity(typename)!;
      const assembled = snapshot.getTypeEntity(typename)!;
      // The getters live on the prototype, so read every property explicitly.
      expect(
        Object.fromEntries(properties.filter(p => p in lazy).map(p => [p, (lazy as any)[p]])),
      ).toEqual(assembled);
      expect(properties.filter(p => p in lazy)).toEqual(properties.filter(p => p in assembled));
    }
    expect(snapshot.getLazyTypeEntity('Unknown')).toBe(null);
  });

  test('listing names, kinds and owners decodes no type', () => {
    const snapshot = fromCache(compose());
    const parse = vi.spyOn(JSON, 'parse');
    try {
      const listed = snapshot.getTypeNames({ withBuiltInScalars: true }).map(typename => {
        const entity = snapshot.getLazyTypeEntity(typename)!;
        return [entity.name, entity.kind, snapshot.getOwnedBy(typename)];
      });
      expect(listed).toContainEqual([
        'Product',
        'ObjectTypeDefinition',
        expect.arrayContaining(['products', 'reviews']),
      ]);
      expect(parse).not.toHaveBeenCalled();

      // The first access to anything else decodes the type, once.
      const product = snapshot.getLazyTypeEntity('Product')!;
      expect(product.description).toBe(undefined);
      expect('fields' in product && product.fields.map(field => field.name)).toEqual([
        'id',
        'name',
        'category',
        'reviews',
      ]);
      expect(parse).toHaveBeenCalledTimes(1);
    } finally {
      parse.mockRestore();
    }
  });
});

describe('binary format', () => {
  const normalize = (value: unknown) =>
    JSON.parse(JSON.stringify(value, (_, v) => (v === null ? undefined : v)) ?? 'null');

  test('every coordinate reads back as the builder produced it', () => {
    const built = compose();
    const snapshot = fromCache(built);
    for (const [coordinate, entry] of Object.entries(built.coordinates)) {
      expect([coordinate, normalize(snapshot.getEntry(coordinate))]).toEqual([
        coordinate,
        normalize(entry),
      ]);
    }
    expect(snapshot.getTypeNames({ withBuiltInScalars: true })).toEqual(built.types);
    expect(snapshot.deprecatedTypes).toEqual(built.deprecatedTypes);
    expect(snapshot.subgraphNames).toEqual(built.subgraphNames);
  });

  test('types whose only deprecation is an argument or an input field are deprecated types', () => {
    const snapshot = fromCache(
      buildSchemaExplorerSnapshot(
        parse(/* GraphQL */ `
          type Query {
            a(old: Int @deprecated): Int
          }
          input In {
            z: Int @deprecated
          }
          type Clean {
            y(x: In): Int
          }
        `),
        null,
      ),
    );
    expect(snapshot.deprecatedTypes).toEqual(['In', 'Query']);
  });

  /** A snapshot written by hand, for cases the GraphQL parser cannot produce. */
  /** Parses supergraph SDL; only the join directives matter for ownership. */
  function supergraph(typeDefs: string) {
    return parse(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
        query: Query
      }
      ${typeDefs}
    `);
  }

  test('owners keep their order', () => {
    const snapshot = fromCache(
      buildSchemaExplorerSnapshot(
        parse(/* GraphQL */ `
          type Query {
            a: String
          }
        `),
        supergraph(/* GraphQL */ `
          enum join__Graph {
            A @join__graph(name: "a", url: "")
            B @join__graph(name: "b", url: "")
          }
          type Query @join__type(graph: B) @join__type(graph: A) {
            a: String
          }
        `),
      ),
    );
    expect(snapshot.getOwnedBy('Query')).toEqual(['b', 'a']);
    expect(snapshot.getOwnedBy('Query.a')).toEqual(['b', 'a']);
  });

  test('a schema without a query type', () => {
    const snapshot = fromCache(
      buildSchemaExplorerSnapshot(
        parse(/* GraphQL */ `
          type Foo {
            a: Int
          }
        `),
        null,
      ),
    );
    expect(snapshot.queryTypeName).toBe(null);
    expect(snapshot.getTypeEntity('Foo')).toMatchObject({ name: 'Foo' });
  });

  test('lone surrogates are replaced instead of failing', () => {
    const built = buildSchemaExplorerSnapshot(
      parse(/* GraphQL */ `
        type Query {
          a: String
        }
      `),
      null,
    );
    // The GraphQL parser rejects lone surrogates, so only a hand-edited snapshot can contain one.
    built.coordinates.Query.description = 'lone \uD800 surrogate';
    const snapshot = fromCache(built);
    expect(snapshot.getTypeEntity('Query')?.description).toBe('lone � surrogate');
  });

  test('a first string starting with U+FEFF is not stripped as a byte order mark', () => {
    // Subgraph names are the first strings of the blob. They are sorted with `localeCompare`,
    // which ignores U+FEFF, so "\uFEFFa" comes before "b".
    const built = buildSchemaExplorerSnapshot(
      parse(/* GraphQL */ `
        type Query {
          a: String
        }
      `),
      supergraph(/* GraphQL */ `
        enum join__Graph {
          A @join__graph(name: "\\uFEFFa", url: "")
          B @join__graph(name: "b", url: "")
        }
        type Query @join__type(graph: B) @join__type(graph: A) {
          a: String @join__field(graph: A)
        }
      `),
    );
    expect(built.subgraphNames).toEqual(['\uFEFFa', 'b']);
    const snapshot = SchemaExplorerSnapshotReader.fromBuffer(encodeSchemaExplorerSnapshot(built));
    expect(snapshot).not.toBe(null);
    expect(snapshot?.subgraphNames).toEqual(['\uFEFFa', 'b']);
    expect(snapshot?.getOwnedBy('Query')).toEqual(['b', '\uFEFFa']);
    expect(snapshot?.getOwnedBy('Query.a')).toEqual(['\uFEFFa']);
    expect(snapshot?.getTypeEntity('Query')).toMatchObject({ fields: [{ name: 'a' }] });
  });

  test('emoji in subgraph names, deprecation reasons and default values', () => {
    const snapshot = fromCache(
      buildSchemaExplorerSnapshot(
        parse(/* GraphQL */ `
          type Query {
            a(arg: String = "👨‍👩‍👧 family"): String @deprecated(reason: "use 🧊 instead")
          }
        `),
        supergraph(/* GraphQL */ `
          enum join__Graph {
            CART @join__graph(name: "🛒 cart", url: "")
            UNICODE @join__graph(name: "ünïcödé", url: "")
          }
          type Query @join__type(graph: UNICODE) @join__type(graph: CART) {
            a(arg: String = "👨‍👩‍👧 family"): String
          }
        `),
      ),
    );

    expect(snapshot.subgraphNames).toEqual(['🛒 cart', 'ünïcödé']);
    expect(snapshot.getOwnedBy('Query')).toEqual(['ünïcödé', '🛒 cart']);
    expect(snapshot.getTypeEntity('Query')).toMatchObject({
      fields: [
        {
          name: 'a',
          deprecationReason: 'use 🧊 instead',
          args: [{ name: 'arg', defaultValue: '👨‍👩‍👧 family' }],
        },
      ],
    });
  });

  test('misaligned buffers are read, truncated or corrupt ones are rejected', () => {
    const buffer = encodeSchemaExplorerSnapshot(compose());

    const shifted = Buffer.alloc(buffer.length + 3);
    buffer.copy(shifted, 3);
    const misaligned = shifted.subarray(3);
    expect(misaligned.byteOffset % 8).not.toBe(0);
    expect(
      SchemaExplorerSnapshotReader.fromBuffer(misaligned)?.getOwnedBy('Product.reviews'),
    ).toEqual(['reviews']);

    expect(SchemaExplorerSnapshotReader.fromBuffer(buffer.subarray(0, buffer.length - 100))).toBe(
      null,
    );
    const corrupt = Buffer.from(buffer);
    // Claim far more types than the buffer holds.
    corrupt.writeUInt32LE(0x7fffffff, 8 + 4 * 4);
    expect(SchemaExplorerSnapshotReader.fromBuffer(corrupt)).toBe(null);
  });
});
