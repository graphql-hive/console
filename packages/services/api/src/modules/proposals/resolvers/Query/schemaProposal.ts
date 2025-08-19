import type {
  CriticalityLevel,
  QueryResolvers,
  SeverityLevelType,
} from './../../../../__generated__/types';

// const schemaSDL = /* GraphQL */ `
//   schema {
//     query: Query
//   }
//   input AInput {
//     """
//     a
//     """
//     a: String = "1"
//     b: String!
//   }
//   input ListInput {
//     a: [String] = ["foo"]
//     b: [String] = ["bar"]
//   }
//   """
//   The Query Root of this schema
//   """
//   type Query {
//     """
//     Just a simple string
//     """
//     a(anArg: String): String!
//     b: BType
//   }
//   type BType {
//     a: String
//   }
//   type CType {
//     a: String @deprecated(reason: "whynot")
//     c: Int!
//     d(arg: Int): String
//   }
//   union MyUnion = CType | BType
//   interface AnInterface {
//     interfaceField: Int!
//   }
//   interface AnotherInterface {
//     anotherInterfaceField: String
//   }
//   type WithInterfaces implements AnInterface & AnotherInterface {
//     a: String!
//   }
//   type WithArguments {
//     a(
//       """
//       Meh
//       """
//       a: Int
//       b: String
//     ): String
//     b(arg: Int = 1): String
//   }
//   enum Options {
//     A
//     B
//     C
//     E
//     F @deprecated(reason: "Old")
//   }
//   """
//   Old
//   """
//   directive @yolo(
//     """
//     Included when true.
//     """
//     someArg: Boolean!
//     anotherArg: String!
//     willBeRemoved: Boolean!
//   ) on FIELD | FRAGMENT_SPREAD | INLINE_FRAGMENT
//   type WillBeRemoved {
//     a: String
//   }
//   directive @willBeRemoved on FIELD
// `;

const changes = [
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'TYPE_ADDED',
    message: "Type 'DType' was added",
    meta: { addedTypeKind: 'ObjectTypeDefinition', addedTypeName: 'DType' },
    path: 'DType',
  },
  {
    type: 'FIELD_ADDED',
    criticality: { level: 'NON_BREAKING' },
    message: "Field 'b' was added to object type 'DType'",
    meta: {
      typeName: 'DType',
      addedFieldName: 'b',
      typeType: 'object type',
      addedFieldReturnType: 'Int!',
    },
    path: 'DType.b',
  },
  {
    criticality: { level: 'BREAKING' },
    type: 'TYPE_REMOVED',
    message: "Type 'WillBeRemoved' was removed",
    meta: { removedTypeName: 'WillBeRemoved' },
    path: 'WillBeRemoved',
  },
  {
    type: 'INPUT_FIELD_ADDED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Adding a required input field to an existing input object type is a breaking change because it will cause existing uses of this input object type to error.',
    },
    message: "Input field 'c' of type 'String!' was added to input object type 'AInput'",
    meta: {
      inputName: 'AInput',
      addedInputFieldName: 'c',
      isAddedInputFieldTypeNullable: false,
      addedInputFieldType: 'String!',
      addedToNewType: false,
    },
    path: 'AInput.c',
  },
  {
    type: 'INPUT_FIELD_REMOVED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing an input field will cause existing queries that use this input field to error.',
    },
    message: "Input field 'b' was removed from input object type 'AInput'",
    meta: { inputName: 'AInput', removedFieldName: 'b', isInputFieldDeprecated: false },
    path: 'AInput.b',
  },
  {
    type: 'INPUT_FIELD_DESCRIPTION_CHANGED',
    criticality: { level: 'NON_BREAKING' },
    message: "Input field 'AInput.a' description changed from 'a' to 'changed'",
    meta: {
      inputName: 'AInput',
      inputFieldName: 'a',
      oldInputFieldDescription: 'a',
      newInputFieldDescription: 'changed',
    },
    path: 'AInput.a',
  },
  {
    type: 'INPUT_FIELD_DEFAULT_VALUE_CHANGED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Changing the default value for an argument may change the runtime behavior of a field if it was never provided.',
    },
    message: "Input field 'AInput.a' default value changed from '\"1\"' to '1'",
    meta: {
      inputName: 'AInput',
      inputFieldName: 'a',
      oldDefaultValue: '"1"',
      newDefaultValue: '1',
    },
    path: 'AInput.a',
  },
  {
    type: 'INPUT_FIELD_TYPE_CHANGED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Changing the type of an input field can cause existing queries that use this field to error.',
    },
    message: "Input field 'AInput.a' changed type from 'String' to 'Int'",
    meta: {
      inputName: 'AInput',
      inputFieldName: 'a',
      oldInputFieldType: 'String',
      newInputFieldType: 'Int',
      isInputFieldTypeChangeSafe: false,
    },
    path: 'AInput.a',
  },
  {
    type: 'INPUT_FIELD_DEFAULT_VALUE_CHANGED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Changing the default value for an argument may change the runtime behavior of a field if it was never provided.',
    },
    message: "Input field 'ListInput.a' default value changed from '[ 'foo' ]' to '[ 'bar' ]'",
    meta: {
      inputName: 'ListInput',
      inputFieldName: 'a',
      oldDefaultValue: "[ 'foo' ]",
      newDefaultValue: "[ 'bar' ]",
    },
    path: 'ListInput.a',
  },
  {
    type: 'FIELD_DESCRIPTION_CHANGED',
    criticality: { level: 'NON_BREAKING' },
    message:
      "Field 'Query.a' description changed from 'Just a simple string' to 'This description has been changed'",
    meta: {
      fieldName: 'a',
      typeName: 'Query',
      oldDescription: 'Just a simple string',
      newDescription: 'This description has been changed',
    },
    path: 'Query.a',
  },
  {
    type: 'FIELD_ARGUMENT_REMOVED',
    criticality: { level: 'BREAKING' },
    message: "Argument 'anArg: String' was removed from field 'Query.a'",
    meta: {
      typeName: 'Query',
      fieldName: 'a',
      removedFieldArgumentName: 'anArg',
      removedFieldType: 'String',
    },
    path: 'Query.a.anArg',
  },
  {
    type: 'FIELD_TYPE_CHANGED',
    criticality: { level: 'BREAKING' },
    message: "Field 'Query.b' changed type from 'BType' to 'Int!'",
    meta: {
      typeName: 'Query',
      fieldName: 'b',
      oldFieldType: 'BType',
      newFieldType: 'Int!',
      isSafeFieldTypeChange: false,
    },
    path: 'Query.b',
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'TYPE_DESCRIPTION_CHANGED',
    message:
      "Description 'The Query Root of this schema' on type 'Query' has changed to 'Query Root description changed'",
    path: 'Query',
    meta: {
      typeName: 'Query',
      newTypeDescription: 'Query Root description changed',
      oldTypeDescription: 'The Query Root of this schema',
    },
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'Changing the kind of a type is a breaking change because it can cause existing queries to error. For example, turning an object type to a scalar type would break queries that define a selection set for this type.',
    },
    type: 'TYPE_KIND_CHANGED',
    message: "'BType' kind changed from 'ObjectTypeDefinition' to 'InputObjectTypeDefinition'",
    path: 'BType',
    meta: {
      typeName: 'BType',
      newTypeKind: 'InputObjectTypeDefinition',
      oldTypeKind: 'ObjectTypeDefinition',
    },
  },
  {
    type: 'OBJECT_TYPE_INTERFACE_ADDED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Adding an interface to an object type may break existing clients that were not programming defensively against a new possible type.',
    },
    message: "'CType' object implements 'AnInterface' interface",
    meta: { objectTypeName: 'CType', addedInterfaceName: 'AnInterface', addedToNewType: false },
    path: 'CType',
  },
  {
    type: 'FIELD_ADDED',
    criticality: { level: 'NON_BREAKING' },
    message: "Field 'b' was added to object type 'CType'",
    meta: {
      typeName: 'CType',
      addedFieldName: 'b',
      typeType: 'object type',
      addedFieldReturnType: 'Int!',
    },
    path: 'CType.b',
  },
  {
    type: 'FIELD_REMOVED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing a field is a breaking change. It is preferable to deprecate the field before removing it. This applies to removed union fields as well, since removal breaks client operations that contain fragments that reference the removed type through direct (... on RemovedType) or indirect means such as __typename in the consumers.',
    },
    message: "Field 'c' was removed from object type 'CType'",
    meta: {
      typeName: 'CType',
      removedFieldName: 'c',
      isRemovedFieldDeprecated: false,
      typeType: 'object type',
    },
    path: 'CType.c',
  },
  {
    type: 'FIELD_DEPRECATION_REASON_CHANGED',
    criticality: { level: 'NON_BREAKING' },
    message: "Deprecation reason on field 'CType.a' has changed from 'whynot' to 'cuz'",
    meta: {
      fieldName: 'a',
      typeName: 'CType',
      newDeprecationReason: 'cuz',
      oldDeprecationReason: 'whynot',
    },
    path: 'CType.a',
  },
  {
    type: 'FIELD_ARGUMENT_ADDED',
    criticality: { level: 'DANGEROUS' },
    message: "Argument 'arg: Int' added to field 'CType.a'",
    meta: {
      typeName: 'CType',
      fieldName: 'a',
      addedArgumentName: 'arg',
      addedArgumentType: 'Int',
      hasDefaultValue: false,
      addedToNewField: false,
      isAddedFieldArgumentBreaking: false,
    },
    path: 'CType.a.arg',
  },
  {
    type: 'FIELD_ARGUMENT_DEFAULT_CHANGED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Changing the default value for an argument may change the runtime behaviour of a field if it was never provided.',
    },
    message: "Default value '10' was added to argument 'arg' on field 'CType.d'",
    meta: { typeName: 'CType', fieldName: 'd', argumentName: 'arg', newDefaultValue: '10' },
    path: 'CType.d.arg',
  },
  {
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Adding a possible type to Unions may break existing clients that were not programming defensively against a new possible type.',
    },
    type: 'UNION_MEMBER_ADDED',
    message: "Member 'DType' was added to Union type 'MyUnion'",
    meta: { unionName: 'MyUnion', addedUnionMemberTypeName: 'DType', addedToNewType: false },
    path: 'MyUnion',
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing a union member from a union can cause existing queries that use this union member in a fragment spread to error.',
    },
    type: 'UNION_MEMBER_REMOVED',
    message: "Member 'BType' was removed from Union type 'MyUnion'",
    meta: { unionName: 'MyUnion', removedUnionMemberTypeName: 'BType' },
    path: 'MyUnion',
  },
  {
    type: 'FIELD_ADDED',
    criticality: { level: 'NON_BREAKING' },
    message: "Field 'b' was added to interface 'AnotherInterface'",
    meta: {
      typeName: 'AnotherInterface',
      addedFieldName: 'b',
      typeType: 'interface',
      addedFieldReturnType: 'Int',
    },
    path: 'AnotherInterface.b',
  },
  {
    type: 'FIELD_REMOVED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing a field is a breaking change. It is preferable to deprecate the field before removing it. This applies to removed union fields as well, since removal breaks client operations that contain fragments that reference the removed type through direct (... on RemovedType) or indirect means such as __typename in the consumers.',
    },
    message: "Field 'anotherInterfaceField' was removed from interface 'AnotherInterface'",
    meta: {
      typeName: 'AnotherInterface',
      removedFieldName: 'anotherInterfaceField',
      isRemovedFieldDeprecated: false,
      typeType: 'interface',
    },
    path: 'AnotherInterface.anotherInterfaceField',
  },
  {
    type: 'OBJECT_TYPE_INTERFACE_REMOVED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing an interface from an object type can cause existing queries that use this in a fragment spread to error.',
    },
    message: "'WithInterfaces' object type no longer implements 'AnotherInterface' interface",
    meta: { objectTypeName: 'WithInterfaces', removedInterfaceName: 'AnotherInterface' },
    path: 'WithInterfaces',
  },
  {
    type: 'FIELD_ARGUMENT_DESCRIPTION_CHANGED',
    criticality: { level: 'NON_BREAKING' },
    message:
      "Description for argument 'a' on field 'WithArguments.a' changed from 'Meh' to 'Description for a'",
    meta: {
      typeName: 'WithArguments',
      fieldName: 'a',
      argumentName: 'a',
      oldDescription: 'Meh',
      newDescription: 'Description for a',
    },
    path: 'WithArguments.a.a',
  },
  {
    type: 'FIELD_ARGUMENT_TYPE_CHANGED',
    criticality: {
      level: 'BREAKING',
      reason:
        "Changing the type of a field's argument can cause existing queries that use this argument to error.",
    },
    message: "Type for argument 'b' on field 'WithArguments.a' changed from 'String' to 'String!'",
    meta: {
      typeName: 'WithArguments',
      fieldName: 'a',
      argumentName: 'b',
      oldArgumentType: 'String',
      newArgumentType: 'String!',
      isSafeArgumentTypeChange: false,
    },
    path: 'WithArguments.a.b',
  },
  {
    type: 'FIELD_ARGUMENT_DEFAULT_CHANGED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Changing the default value for an argument may change the runtime behaviour of a field if it was never provided.',
    },
    message: "Default value for argument 'arg' on field 'WithArguments.b' changed from '1' to '2'",
    meta: {
      typeName: 'WithArguments',
      fieldName: 'b',
      argumentName: 'arg',
      oldDefaultValue: '1',
      newDefaultValue: '2',
    },
    path: 'WithArguments.b.arg',
  },
  {
    type: 'ENUM_VALUE_ADDED',
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Adding an enum value may break existing clients that were not programming defensively against an added case when querying an enum.',
    },
    message: "Enum value 'D' was added to enum 'Options'",
    meta: {
      enumName: 'Options',
      addedEnumValueName: 'D',
      addedToNewType: false,
      addedDirectiveDescription: null,
    },
    path: 'Options.D',
  },
  {
    type: 'ENUM_VALUE_REMOVED',
    criticality: {
      level: 'BREAKING',
      reason:
        'Removing an enum value will cause existing queries that use this enum value to error.',
    },
    message: "Enum value 'C' was removed from enum 'Options'",
    meta: { enumName: 'Options', removedEnumValueName: 'C', isEnumValueDeprecated: false },
    path: 'Options.C',
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'ENUM_VALUE_DESCRIPTION_CHANGED',
    message: "Description 'Stuff' was added to enum value 'Options.A'",
    path: 'Options.A',
    meta: {
      enumName: 'Options',
      enumValueName: 'A',
      oldEnumValueDescription: null,
      newEnumValueDescription: 'Stuff',
    },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'ENUM_VALUE_DEPRECATION_REASON_ADDED',
    message: "Enum value 'Options.E' was deprecated with reason 'No longer supported'",
    path: 'Options.E.@deprecated',
    meta: {
      enumName: 'Options',
      enumValueName: 'E',
      addedValueDeprecationReason: 'No longer supported',
    },
  },
  {
    criticality: {
      level: 'NON_BREAKING',
      reason: "Directive 'deprecated' was added to enum value 'Options.E'",
    },
    type: 'DIRECTIVE_USAGE_ENUM_VALUE_ADDED',
    message: "Directive 'deprecated' was added to enum value 'Options.E'",
    path: 'Options.E.@deprecated',
    meta: {
      enumName: 'Options',
      enumValueName: 'E',
      addedDirectiveName: 'deprecated',
      addedToNewType: false,
    },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'ENUM_VALUE_DEPRECATION_REASON_CHANGED',
    message: "Enum value 'Options.F' deprecation reason changed from 'Old' to 'New'",
    path: 'Options.F.@deprecated',
    meta: {
      enumName: 'Options',
      enumValueName: 'F',
      oldEnumValueDeprecationReason: 'Old',
      newEnumValueDeprecationReason: 'New',
    },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'DIRECTIVE_ADDED',
    message: "Directive 'yolo2' was added",
    path: '@yolo2',
    meta: {
      addedDirectiveName: 'yolo2',
      addedDirectiveDescription: null,
      addedDirectiveLocations: ['FIELD'],
      addedDirectiveRepeatable: false,
    },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'DIRECTIVE_LOCATION_ADDED',
    message: "Location 'FIELD' was added to directive 'yolo2'",
    path: '@yolo2',
    meta: { directiveName: 'yolo2', addedDirectiveLocation: 'FIELD' },
  },
  {
    criticality: {
      level: 'NON_BREAKING',
      reason:
        'Refer to the directive usage for the breaking status. If the directive is new and therefore unused, then adding an argument does not risk breaking clients.',
    },
    type: 'DIRECTIVE_ARGUMENT_ADDED',
    message: "Argument 'someArg' was added to directive 'yolo2'",
    path: '@yolo2',
    meta: {
      directiveName: 'yolo2',
      addedDirectiveArgumentName: 'someArg',
      addedDirectiveArgumentType: 'String!',
      addedDirectiveDefaultValue: '',
      addedDirectiveArgumentTypeIsNonNull: true,
      addedDirectiveArgumentDescription: 'Included when true.',
      addedToNewDirective: true,
    },
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'A directive could be in use of a client application. Removing it could break the client application.',
    },
    type: 'DIRECTIVE_REMOVED',
    message: "Directive 'willBeRemoved' was removed",
    path: '@willBeRemoved',
    meta: { removedDirectiveName: 'willBeRemoved' },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'DIRECTIVE_DESCRIPTION_CHANGED',
    message: "Directive 'yolo' description changed from 'Old' to 'New'",
    path: '@yolo',
    meta: { directiveName: 'yolo', oldDirectiveDescription: 'Old', newDirectiveDescription: 'New' },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'DIRECTIVE_LOCATION_ADDED',
    message: "Location 'FIELD_DEFINITION' was added to directive 'yolo'",
    path: '@yolo',
    meta: { directiveName: 'yolo', addedDirectiveLocation: 'FIELD_DEFINITION' },
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'A directive could be in use of a client application. Removing it could break the client application.',
    },
    type: 'DIRECTIVE_LOCATION_REMOVED',
    message: "Location 'FRAGMENT_SPREAD' was removed from directive 'yolo'",
    path: '@yolo',
    meta: { directiveName: 'yolo', removedDirectiveLocation: 'FRAGMENT_SPREAD' },
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'A directive could be in use of a client application. Removing it could break the client application.',
    },
    type: 'DIRECTIVE_LOCATION_REMOVED',
    message: "Location 'INLINE_FRAGMENT' was removed from directive 'yolo'",
    path: '@yolo',
    meta: { directiveName: 'yolo', removedDirectiveLocation: 'INLINE_FRAGMENT' },
  },
  {
    criticality: {
      level: 'BREAKING',
      reason:
        'A directive argument could be in use of a client application. Removing the argument can break client applications.',
    },
    type: 'DIRECTIVE_ARGUMENT_REMOVED',
    message: "Argument 'willBeRemoved' was removed from directive 'yolo'",
    path: '@yolo.willBeRemoved',
    meta: { directiveName: 'yolo', removedDirectiveArgumentName: 'willBeRemoved' },
  },
  {
    criticality: { level: 'NON_BREAKING' },
    type: 'DIRECTIVE_ARGUMENT_DESCRIPTION_CHANGED',
    message:
      "Description for argument 'someArg' on directive 'yolo' changed from 'Included when true.' to 'someArg does stuff'",
    path: '@yolo.someArg',
    meta: {
      directiveName: 'yolo',
      directiveArgumentName: 'someArg',
      oldDirectiveArgumentDescription: 'Included when true.',
      newDirectiveArgumentDescription: 'someArg does stuff',
    },
  },
  {
    criticality: { level: 'BREAKING' },
    type: 'DIRECTIVE_ARGUMENT_TYPE_CHANGED',
    message: "Type for argument 'someArg' on directive 'yolo' changed from 'Boolean!' to 'String!'",
    path: '@yolo.someArg',
    meta: {
      directiveName: 'yolo',
      directiveArgumentName: 'someArg',
      oldDirectiveArgumentType: 'Boolean!',
      newDirectiveArgumentType: 'String!',
      isSafeDirectiveArgumentTypeChange: false,
    },
  },
  {
    criticality: {
      level: 'DANGEROUS',
      reason:
        'Changing the default value for an argument may change the runtime behaviour of a field if it was never provided.',
    },
    type: 'DIRECTIVE_ARGUMENT_DEFAULT_VALUE_CHANGED',
    message: "Default value '\"Test\"' was added to argument 'anotherArg' on directive 'yolo'",
    path: '@yolo.anotherArg',
    meta: {
      directiveName: 'yolo',
      directiveArgumentName: 'anotherArg',
      newDirectiveArgumentDefaultValue: '"Test"',
    },
  },
];

function toPascalCase(str: string) {
  // Handle empty or non-string inputs
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }

  // Split the string by common delimiters (spaces, hyphens, underscores)
  const words = str.split(/[\s\-_]+/);

  // Capitalize the first letter of each word and convert the rest to lowercase
  const pascalCasedWords = words.map(word => {
    if (word.length === 0) {
      return '';
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Join the words together
  return pascalCasedWords.join('');
}

export const schemaProposal: NonNullable<QueryResolvers['schemaProposal']> = (
  _parent,
  { input: { id } },
  _ctx,
) => {
  /* Implement Query.schemaProposal resolver logic here */
  return {
    createdAt: Date.now(),
    id,
    stage: 'OPEN',
    updatedAt: Date.now(),
    commentsCount: 5,
    title: 'This adds some stuff to the thing.',
    versions: {
      pageInfo: {
        startCursor: 'start',
        endCursor: 'end',
        hasNextPage: false,
        hasPreviousPage: false,
      },
      edges: [
        {
          cursor: '12345',
          node: {
            id: '12345',
            serviceName: 'panda',
            changes: changes.map(c => {
              return {
                path: c.path,
                isSafeBasedOnUsage: false, // @todo
                message: c.message,
                criticality: c.criticality.level as CriticalityLevel,
                criticalityReason: c.criticality.reason,
                severityLevel: c.criticality.level as SeverityLevelType,
                severityReason: c.criticality.reason,
                meta: {
                  __typename: toPascalCase(c.type),
                  ...(c.meta as any),
                },
              };
            }),
            createdAt: Date.now(),
            schemaProposal: {
              /* ??? */
            } as any,
          },
        },
      ],
    },
    user: {
      id: 'asdffff',
      displayName: 'jdolle',
      fullName: 'Jeff Dolle',
      email: 'jdolle+test@the-guild.dev',
    } as any,
    reviews: {
      edges: [
        {
          cursor: 'asdf',
          node: {
            id: '1',
            comments: {
              pageInfo: {
                endCursor: crypto.randomUUID(),
                startCursor: crypto.randomUUID(),
                hasNextPage: false,
                hasPreviousPage: false,
              },
              edges: [
                {
                  cursor: crypto.randomUUID(),
                  node: {
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    body: 'This is a comment. The first comment.',
                    updatedAt: Date.now(),
                  },
                },
              ],
            },
            createdAt: Date.now(),
            lineText: 'type User {',
            lineNumber: 2,
            stageTransition: 'OPEN',
          },
        },
      ],
      pageInfo: {
        startCursor: 'asdf',
        endCursor: 'wxyz',
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  };
};
