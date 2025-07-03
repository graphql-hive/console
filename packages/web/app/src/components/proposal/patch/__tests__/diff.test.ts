import { buildSchema, GraphQLSchema, lexicographicSortSchema, printSchema } from 'graphql';
import { diff } from '@graphql-inspector/core';
import { patchSchema } from '../diff';

function printSortedSchema(schema: GraphQLSchema) {
  return printSchema(lexicographicSortSchema(schema));
}

const schemaA = buildSchema(
  /** GraphQL */ `
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@shareable", "@inaccessible", "@tag"]
    )
    @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
    @meta(name: "priority", content: "tier1")

  directive @meta(
    name: String!
    content: String!
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

  directive @myDirective(a: String!) on FIELD_DEFINITION

  directive @hello on FIELD_DEFINITION

  type Query {
    allProducts: [ProductItf] @meta(name: "owner", content: "hive-team")
    product(id: ID!): ProductItf
  }

  interface ProductItf implements SkuItf @meta(name: "domain", content: "products") {
    id: ID!
    sku: String
    name: String
    package: String
    variation: ProductVariation
    dimensions: ProductDimension
    createdBy: User
    hidden: String @inaccessible
    oldField: String @deprecated(reason: "refactored out")
  }

  interface SkuItf {
    sku: String
  }

  type Product implements ProductItf & SkuItf
    @key(fields: "id")
    @key(fields: "sku package")
    @key(fields: "sku variation { id }")
    @meta(name: "owner", content: "product-team") {
    id: ID! @tag(name: "hi-from-products")
    sku: String @meta(name: "unique", content: "true")
    name: String @hello
    package: String
    variation: ProductVariation
    dimensions: ProductDimension
    createdBy: User
    hidden: String
    reviewsScore: Float!
    oldField: String
  }

  enum ShippingClass {
    STANDARD
    EXPRESS
  }

  type ProductVariation {
    id: ID!
    name: String
  }

  type ProductDimension @shareable {
    size: String
    weight: Float
  }

  type User @key(fields: "email") {
    email: ID!
    totalProductsCreated: Int @shareable
  }
`,
  { assumeValid: true, assumeValidSDL: true },
);

const schemaB = buildSchema(
  /** GraphQL */ `
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@shareable", "@inaccessible", "@tag"]
    )
    @link(url: "https://specs.graphql-hive.com/hive/v1.0", import: ["@meta"])
    @meta(name: "priority", content: "tier1")

  directive @meta(
    name: String!
    content: String!
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION

  directive @myDirective(a: String!) on FIELD_DEFINITION

  directive @hello on FIELD_DEFINITION

  type Query {
    allProducts: [ProductItf] @meta(name: "owner", content: "hive-team")
    product(id: ID!): ProductItf
    foo: AddedFoo
  }

  interface ProductItf implements SkuItf @meta(name: "domain", content: "products") {
    id: ID!
    sku: String
    name: String
    package: String
    variation: ProductVariation
    dimensions: ProductDimension
    hidden: String @inaccessible
  }

  interface SkuItf {
    sku: String
  }

  type Product implements ProductItf & SkuItf
    @key(fields: "id")
    @key(fields: "sku package")
    @key(fields: "sku variation { id }")
    @meta(name: "owner", content: "product-team") {
    id: ID! @tag(name: "hi-from-products")
    sku: String @meta(name: "unique", content: "true")
    name: String @hello
    package: String
    variation: ProductVariation
    dimensions: ProductDimension
    hidden: String
    reviewsScore: Float!
    oldField: String
  }

  """
  New comment on ShippingClass
  """
  enum ShippingClass {
    STANDARD

    """
    Super duper fast
    """
    EXPRESS
  }

  type ProductVariation {
    id: ID!
    name: String
  }

  type ProductDimension @shareable {
    size: String
    weight: Float
  }

  """
  This is a comment on AddedFoo
  """
  type AddedFoo {
    id: ID!
    bar: Bar
    fooBar: FooBar
  }

  enum Bar {
    A
    B
    C
  }

  scalar FooBar
`,
  { assumeValid: true, assumeValidSDL: true },
);

const editScript = await diff(schemaA, schemaB);

test('patch', async () => {
  console.log(`Applying changes: ${editScript.map(e => JSON.stringify(e)).join('\n')}`);
  expect(printSortedSchema(schemaB)).toBe(printSortedSchema(patchSchema(schemaA, editScript)));
});

// test.only('printDiff', () => {
//   expect(printDiff(schemaB, applyChanges(schemaA, editScript))).toBe('');
// })
