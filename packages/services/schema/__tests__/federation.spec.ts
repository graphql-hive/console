import { buildASTSchema, parse, validate } from 'graphql';
import { composeAndValidate } from '@apollo/federation';
import { composeFederationV1, composeFederationV2 } from '../src/lib/compose';

vi.mock('@apollo/federation', async importOriginal => {
  const federation = await importOriginal<typeof import('@apollo/federation')>();
  return { ...federation, composeAndValidate: vi.fn(federation.composeAndValidate) };
});

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
        directive @meta on ENUM

        enum BarKind {
          A
          B
        }

        extend enum BarKind @meta

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

  expect(result.schema.getType('Bar')).toBeDefined();
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

test.each([
  { fields: '...F', message: /fragment spreads/ },
  { fields: '{ id }', message: /Syntax Error/ },
  { fields: 'id } query { x', message: /FieldSets may not contain operations/ },
  { fields: '', message: /FieldSets may not contain empty selection sets/ },
  { fields: 'id b { }', message: /FieldSets may not contain empty selection sets/ },
])(
  'federation v1 reports a composer exception for @key(fields: "$fields") as a composition error',
  ({ fields, message }) => {
    const result = composeFederationV1([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            a: A
          }

          type A @key(fields: "${fields}") {
            id: ID!
          }
        `),
        name: 'a',
        url: undefined,
      },
    ]);

    expect(result.type).toBe('failure');
    assert(result.type === 'failure');
    expect(result.includesException).toBe(false);
    expect(result.result.errors).toEqual([
      { source: 'composition', message: expect.stringMatching(message) },
    ]);
  },
);

test('federation v1 keeps the definitions declared after a root type without fields', ({
  expect,
}) => {
  const result = composeFederationV1([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          order: Order
        }

        type Order @key(fields: "id") {
          id: ID!
        }
      `),
      name: 'orders',
      url: 'https://orders.example.com/graphql',
    },
    {
      typeDefs: parse(/* GraphQL */ `
        type Query

        type Mutation

        type Shipment @key(fields: "id") {
          id: ID!
        }

        extend type Query {
          shipment: Shipment
        }

        extend type Mutation {
          createShipment: Shipment
        }
      `),
      name: 'shipments',
      url: 'https://shipments.example.com/graphql',
    },
  ]);

  expect(result.type).toBe('success');
  assert(result.type === 'success');
  const schema = buildASTSchema(result.result.sdlDocumentNode);
  expect(schema.getType('Shipment')).toBeDefined();
  expect(schema.getQueryType()?.getFields()).toHaveProperty('shipment');
  expect(schema.getMutationType()?.getFields()).toHaveProperty('createShipment');
});

test.each([
  { directive: 'requires', sdl: 'weight: Int @requires(fields: "dimensions { }")' },
  { directive: 'provides', sdl: 'related: Product @provides(fields: "dimensions { }")' },
])(
  'federation v1 reports an empty nested selection in @$directive as a composition error',
  ({ sdl }) => {
    const result = composeFederationV1([
      {
        typeDefs: parse(/* GraphQL */ `
          type Query {
            product: Product
          }

          type Product @key(fields: "id") {
            id: ID!
            dimensions: Dimensions
          }

          type Dimensions {
            size: Int
          }
        `),
        name: 'products',
        url: undefined,
      },
      {
        typeDefs: parse(/* GraphQL */ `
          extend type Product @key(fields: "id") {
            id: ID! @external
            dimensions: Dimensions @external
            ${sdl}
          }

          type Dimensions {
            size: Int
          }
        `),
        name: 'shipping',
        url: undefined,
      },
    ]);

    expect(result.type).toBe('failure');
    assert(result.type === 'failure');
    expect(result.includesException).toBe(false);
    expect(result.result.errors).toEqual([
      {
        source: 'composition',
        message: expect.stringMatching(/FieldSets may not contain empty selection sets/),
      },
    ]);
  },
);

test('federation v1 reports an internal composer exception as an unexpected composition error', ({
  expect,
}) => {
  vi.mocked(composeAndValidate).mockImplementationOnce(() => {
    throw new TypeError("Cannot read properties of undefined (reading 'value')");
  });

  const result = composeFederationV1([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          a: Int
        }
      `),
      name: 'a',
      url: undefined,
    },
  ]);

  expect(result.type).toBe('failure');
  assert(result.type === 'failure');
  expect(result.includesException).toBe(true);
  expect(result.result.errors).toEqual([
    { source: 'composition', message: 'Unexpected composition error.' },
  ]);
});

test('federation v1 keeps argument default values in the supergraph', ({ expect }) => {
  const result = composeFederationV1([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          product(id: ID!): Product
        }

        type Product @key(fields: "id") {
          id: ID!
          shippingCostV2(quantity: Int! = 1): Float
        }
      `),
      name: 'products',
      url: 'https://products.example.com/graphql',
    },
  ]);

  expect(result.type).toBe('success');
  assert(result.type === 'success');
  expect(result.result.supergraph).toContain('shippingCostV2(quantity: Int! = 1): Float');
  expect(result.result.sdl).toContain('shippingCostV2(quantity: Int! = 1): Float');

  // A nullable variable may be passed to a non-null argument only when the argument has a default.
  const supergraph = buildASTSchema(result.result.supergraphDocumentNode);
  const errors = validate(
    supergraph,
    parse(/* GraphQL */ `
      query ($quantity: Int) {
        product(id: "1") {
          shippingCostV2(quantity: $quantity)
        }
      }
    `),
  );
  expect(errors).toEqual([]);
});

test('federation v1 keeps default values of arguments, input fields and directive arguments in the supergraph', ({
  expect,
}) => {
  const result = composeFederationV1([
    {
      typeDefs: parse(/* GraphQL */ `
        directive @lowercase(enabled: Boolean = true) repeatable on FIELD

        enum Scope {
          PUBLIC
          PRIVATE
        }

        input Range {
          from: Int = 0
          to: Int
          label: String = "x"
          ratio: Float = 1.5
          scope: Scope = PUBLIC
          scopes: [Scope!] = [PUBLIC, PRIVATE]
          nested: Nested = { size: 1 }
          nothing: Int = null
        }

        input Nested {
          size: Int = 5
        }

        interface Named {
          name(locale: String = "en"): String
        }

        type Product implements Named @key(fields: "id") {
          id: ID!
          name(locale: String = "en"): String
          price(currency: String = "EUR", range: Range = { from: 1 }, scope: Scope = PRIVATE): Float
        }

        type Query {
          products(first: Int = 20, after: String = null): [Product!]!
        }

        type Mutation {
          bump(by: Int! = 1): Int
        }
      `),
      name: 'products',
      url: 'https://products.example.com/graphql',
    },
    {
      typeDefs: parse(/* GraphQL */ `
        directive @lowercase(enabled: Boolean = true) repeatable on FIELD

        extend type Product @key(fields: "id") {
          id: ID! @external
          reviews(first: Int = 3): [Review!]!
        }

        type Review {
          body("maximum length" truncate: Int = 200): String
        }

        extend type Query {
          topReviews(first: Int = 5): [Review!]!
        }
      `),
      name: 'reviews',
      url: 'https://reviews.example.com/graphql',
    },
  ]);

  expect(result.type).toBe('success');
  assert(result.type === 'success');
  expect(result.result.supergraph).toMatchInlineSnapshot(`
    schema
      @core(feature: "https://specs.apollo.dev/core/v0.2"),
      @core(feature: "https://specs.apollo.dev/join/v0.1", for: EXECUTION)
    {
      query: Query
      mutation: Mutation
    }

    directive @core(as: String, feature: String!, for: core__Purpose) repeatable on SCHEMA

    directive @join__field(graph: join__Graph, provides: join__FieldSet, requires: join__FieldSet) on FIELD_DEFINITION

    directive @join__graph(name: String!, url: String!) on ENUM_VALUE

    directive @join__owner(graph: join__Graph!) on INTERFACE | OBJECT

    directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on INTERFACE | OBJECT

    directive @lowercase(enabled: Boolean = true) repeatable on FIELD

    type Mutation {
      bump(by: Int! = 1): Int @join__field(graph: PRODUCTS)
    }

    interface Named {
      name(locale: String = "en"): String
    }

    input Nested {
      size: Int = 5
    }

    type Product implements Named
      @join__owner(graph: PRODUCTS)
      @join__type(graph: PRODUCTS, key: "id")
      @join__type(graph: REVIEWS, key: "id")
    {
      id: ID! @join__field(graph: PRODUCTS)
      name(locale: String = "en"): String @join__field(graph: PRODUCTS)
      price(currency: String = "EUR", range: Range = { from: 1 }, scope: Scope = PRIVATE): Float @join__field(graph: PRODUCTS)
      reviews(first: Int = 3): [Review!]! @join__field(graph: REVIEWS)
    }

    type Query {
      products(after: String = null, first: Int = 20): [Product!]! @join__field(graph: PRODUCTS)
      topReviews(first: Int = 5): [Review!]! @join__field(graph: REVIEWS)
    }

    input Range {
      from: Int = 0
      label: String = "x"
      nested: Nested = { size: 1 }
      nothing: Int = null
      ratio: Float = 1.5
      scope: Scope = PUBLIC
      scopes: [Scope!] = [PUBLIC, PRIVATE]
      to: Int
    }

    type Review {
      body(
        """maximum length"""
        truncate: Int = 200
      ): String
    }

    enum Scope {
      PRIVATE
      PUBLIC
    }

    enum core__Purpose {
      """
      \`EXECUTION\` features provide metadata necessary to for operation execution.
      """
      EXECUTION

      """
      \`SECURITY\` features provide metadata necessary to securely resolve fields.
      """
      SECURITY
    }

    scalar join__FieldSet

    enum join__Graph {
      PRODUCTS @join__graph(name: "products" url: "https://products.example.com/graphql")
      REVIEWS @join__graph(name: "reviews" url: "https://reviews.example.com/graphql")
    }
  `);
});

test('federation v1 reports composition errors with the composition source', ({ expect }) => {
  const result = composeFederationV1([
    {
      typeDefs: parse(/* GraphQL */ `
        type Query {
          a: Int
        }

        extend type Shipment @key(fields: "id") {
          id: ID! @external
        }
      `),
      name: 'a',
      url: undefined,
    },
  ]);

  expect(result.type).toBe('failure');
  assert(result.type === 'failure');
  expect(result.result.errors).toContainEqual({
    source: 'composition',
    message:
      '[a] Shipment -> `Shipment` is an extension type, but `Shipment` is not defined in any service',
  });
  expect(result.result.errors.filter(error => error.source !== 'composition')).toEqual([]);
});
