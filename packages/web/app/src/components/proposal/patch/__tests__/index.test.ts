import { buildSchema, GraphQLSchema, lexicographicSortSchema, printSchema } from 'graphql';
import type { Change, CriticalityLevel } from '@graphql-inspector/core';
import { patchSchema } from '../index';

function printSortedSchema(schema: GraphQLSchema) {
  return printSchema(lexicographicSortSchema(schema));
}

const schemaA = buildSchema(
  /* GraphQL */ `
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
  /* GraphQL */ `
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
      allProducts(input: AllProductsInput): [ProductItf] @meta(name: "owner", content: "hive-team")
      product(id: ID!): ProductItf
    }

    input AllProductsInput {
      """
      User ID who created the product record
      """
      byCreator: ID

      """
      Search by partial match on a name.
      """
      byName: String
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
      """
      The latest variation
      """
      variation: ProductVariation
        @deprecated(reason: "There can be multiple variations. Prefer Product.variations")
      variations: [ProductVariation]
      dimensions: ProductDimension
      createdBy: User!
      hidden: String
      reviewsScore: Float!
    }

    enum ShippingClass {
      STANDARD
      EXPRESS
      OVERNIGHT
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

const changes: Change[] = [
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message: "Type 'AllProductsInput' was added",
    meta: {
      addedTypeIsOneOf: false,
      addedTypeKind: 'InputObjectTypeDefinition',
      addedTypeName: 'AllProductsInput',
    },
    path: 'AllProductsInput',
    type: 'TYPE_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message:
      "Input field 'byCreator' of type 'ID' was added to input object type 'AllProductsInput'",
    meta: {
      addedInputFieldName: 'byCreator',
      addedInputFieldType: 'ID',
      addedToNewType: true,
      inputName: 'AllProductsInput',
      isAddedInputFieldTypeNullable: true,
    },
    path: 'AllProductsInput.byCreator',
    type: 'INPUT_FIELD_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message:
      "Input field 'AllProductsInput.byCreator' has description 'User ID who created the product record'",
    meta: {
      addedInputFieldDescription: 'User ID who created the product record',
      inputFieldName: 'byCreator',
      inputName: 'AllProductsInput',
    },
    path: 'AllProductsInput.byCreator',
    type: 'INPUT_FIELD_DESCRIPTION_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message:
      "Input field 'byName' of type 'String' was added to input object type 'AllProductsInput'",
    meta: {
      addedInputFieldName: 'byName',
      addedInputFieldType: 'String',
      addedToNewType: true,
      inputName: 'AllProductsInput',
      isAddedInputFieldTypeNullable: true,
    },
    path: 'AllProductsInput.byName',
    type: 'INPUT_FIELD_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message:
      "Input field 'AllProductsInput.byName' has description 'Search by partial match on a name.'",
    meta: {
      addedInputFieldDescription: 'Search by partial match on a name.',
      inputFieldName: 'byName',
      inputName: 'AllProductsInput',
    },
    path: 'AllProductsInput.byName',
    type: 'INPUT_FIELD_DESCRIPTION_ADDED',
  },
  {
    criticality: {
      level: 'DANGEROUS' as CriticalityLevel.Dangerous,
    },
    message: "Argument 'input: AllProductsInput' added to field 'Query.allProducts'",
    meta: {
      addedArgumentName: 'input',
      addedArgumentType: 'AllProductsInput',
      addedToNewField: false,
      fieldName: 'allProducts',
      hasDefaultValue: false,
      isAddedFieldArgumentBreaking: false,
      typeName: 'Query',
    },
    path: 'Query.allProducts.input',
    type: 'FIELD_ARGUMENT_ADDED',
  },
  {
    criticality: {
      level: 'BREAKING' as CriticalityLevel,
      reason:
        "Removing a deprecated field is a breaking change. Before removing it, you may want to look at the field's usage to see the impact of removing the field.",
    },
    message: "Field 'oldField' (deprecated) was removed from interface 'ProductItf'",
    meta: {
      isRemovedFieldDeprecated: true,
      removedFieldName: 'oldField',
      typeName: 'ProductItf',
      typeType: 'interface',
    },
    path: 'ProductItf.oldField',
    type: 'FIELD_REMOVED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message: "Field 'variations' was added to object type 'Product'",
    meta: {
      addedFieldName: 'variations',
      addedFieldReturnType: '[ProductVariation]',
      typeName: 'Product',
      typeType: 'object type',
    },
    path: 'Product.variations',
    type: 'FIELD_ADDED',
  },
  {
    criticality: {
      level: 'BREAKING' as CriticalityLevel,
      reason:
        'Removing a field is a breaking change. It is preferable to deprecate the field before removing it. This applies to removed union fields as well, since removal breaks client operations that contain fragments that reference the removed type through direct (... on RemovedType) or indirect means such as __typename in the consumers.',
    },
    message: "Field 'oldField' was removed from object type 'Product'",
    meta: {
      isRemovedFieldDeprecated: false,
      removedFieldName: 'oldField',
      typeName: 'Product',
      typeType: 'object type',
    },
    path: 'Product.oldField',
    type: 'FIELD_REMOVED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message: "Field 'Product.variation' has description 'The latest variation'",
    meta: {
      addedDescription: 'The latest variation',
      fieldName: 'variation',
      typeName: 'Product',
    },
    path: 'Product.variation',
    type: 'FIELD_DESCRIPTION_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message: "Field 'Product.variation' is deprecated",
    meta: {
      deprecationReason: 'There can be multiple variations. Prefer Product.variations',
      fieldName: 'variation',
      typeName: 'Product',
    },
    path: 'Product.variation',
    type: 'FIELD_DEPRECATION_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
      reason: "Directive 'deprecated' was added to field 'variation'",
    },
    message: "Directive 'deprecated' was added to field 'Product.variation'",
    meta: {
      addedDirectiveName: 'deprecated',
      addedToNewType: false,
      fieldName: 'variation',
      typeName: 'Product',
    },
    path: 'Product.variation.deprecated',
    type: 'DIRECTIVE_USAGE_FIELD_DEFINITION_ADDED',
  },
  {
    criticality: {
      level: 'NON_BREAKING' as CriticalityLevel,
    },
    message: "Field 'Product.createdBy' changed type from 'User' to 'User!'",
    meta: {
      fieldName: 'createdBy',
      isSafeFieldTypeChange: true,
      newFieldType: 'User!',
      oldFieldType: 'User',
      typeName: 'Product',
    },
    path: 'Product.createdBy',
    type: 'FIELD_TYPE_CHANGED',
  },
  {
    criticality: {
      level: 'DANGEROUS' as CriticalityLevel.Dangerous,
      reason:
        'Adding an enum value may break existing clients that were not programming defensively against an added case when querying an enum.',
    },
    message: "Enum value 'OVERNIGHT' was added to enum 'ShippingClass'",
    meta: {
      addedEnumValueName: 'OVERNIGHT',
      addedToNewType: false,
      enumName: 'ShippingClass',
    },
    path: 'ShippingClass.OVERNIGHT',
    type: 'ENUM_VALUE_ADDED',
  },
];

test('patch', async () => {
  expect(printSortedSchema(schemaB)).toBe(printSortedSchema(patchSchema(schemaA, changes)));
});
