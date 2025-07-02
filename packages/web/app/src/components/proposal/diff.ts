import { Change, SerializableChange, ChangeType } from '@graphql-inspector/core';
import { GraphQLSchema, printSchema, parse, DocumentNode, DefinitionNode, Kind, buildASTSchema, NameNode, ObjectTypeDefinitionNode, FieldDefinitionNode, ASTKindToNode, InterfaceTypeDefinitionNode, SchemaDefinitionNode, SchemaExtensionNode, ExecutableDefinitionNode, print, InputValueDefinitionNode, StringValueNode, ObjectTypeExtensionNode, DirectiveDefinitionNode, TypeExtensionNode, TypeDefinitionNode, TypeSystemDefinitionNode, ValueNode, astFromValue, GraphQLString, TypeNode, InterfaceTypeExtensionNode, InputObjectTypeDefinitionNode, InputObjectTypeExtensionNode, UnionTypeDefinitionNode, UnionTypeExtensionNode, ScalarTypeDefinitionNode, ScalarTypeExtensionNode, EnumTypeDefinitionNode, EnumTypeExtensionNode, visit, parseType, ArgumentNode } from 'graphql';

export type TypeOfChangeType = (typeof ChangeType)[keyof typeof ChangeType];

function nameNode(name: string): NameNode {
  return {
    value: name,
    kind: Kind.NAME,
  };
}

export function patchSchema(schema: GraphQLSchema, changes: SerializableChange[]): GraphQLSchema {
  const ast = parse(printSchema(schema));
  return buildASTSchema(patch(ast, changes), { assumeValid: true, assumeValidSDL: true });
}

function patchObjectType(node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode | InterfaceTypeDefinitionNode | InterfaceTypeExtensionNode, changes: ChangesByType) {
  /** REMOVE TYPES */
  const isRemoved = changes[ChangeType.TypeRemoved]?.find(change => change.meta.removedTypeName === node.name.value) ?? false;
  if (isRemoved) {
    return null;
  }

  /** REMOVE FIELDS */
  const fieldRemovalsForType: Set<string> = new Set(
    (changes[ChangeType.FieldRemoved] ?? [])
      .filter(change => change.meta.typeName === node.name.value)
      // @note consider using more of the metadata OR pre-mapping the removed fields to avoid having to map for every type's list.
      .map(f => f.meta.removedFieldName),
  );

  if (fieldRemovalsForType.size) {
    (node.fields as any) = node.fields?.filter(f => !fieldRemovalsForType.has(f.name.value));
  }

  /** ADD FIELDS */
  const addedFields = changes[ChangeType.FieldAdded]?.filter(change => change.meta.typeName === node.name.value).map((change) => {
    const fieldDefinitionNode: FieldDefinitionNode = {
      kind: Kind.FIELD_DEFINITION,
      name: nameNode(change.meta.addedFieldName),
      // @todo typeType is bugged atm. Fix this. Prefer adding a new `addedFieldType` field.
      // type: parseType(change.meta.typeType),
      type: parseType('String'),
      
    };
    return fieldDefinitionNode;
  })

  if (addedFields?.length) {
    (node.fields as any) = [...(node.fields ??[]), ...addedFields];
  }

  /** Patch fields */
  (node.fields as any) = node.fields?.map(field => patchField(node.name.value, field, changes));

  return node;
}

function patchField(typeName: string, field: FieldDefinitionNode, changes: ChangesByType) {
  {
    const change = changes[ChangeType.FieldDescriptionAdded]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      ((field.description as StringValueNode).value as any) = change.meta.addedDescription;
    }
  }

  {
    const change = changes[ChangeType.FieldDescriptionChanged]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      ((field.description as StringValueNode).value as any) = change.meta.newDescription;
    }
  }

  {
    const change = changes[ChangeType.FieldDescriptionRemoved]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      (field.description as StringValueNode | undefined) = undefined;
    }
  }

  {
    const fieldChanges = changes[ChangeType.FieldArgumentAdded]?.filter(change =>
      change.meta.typeName === typeName && field.name.value === change.meta.fieldName,
    );
    if (fieldChanges) {
      const argumentAdditions = fieldChanges.map((change): InputValueDefinitionNode => ({
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: nameNode(change.meta.addedArgumentName),
        type: parseType(change.meta.addedArgumentType),
        // defaultValue: change.meta.hasDefaultValue ? 
      }));
      (field.arguments as InputValueDefinitionNode[] | undefined) = [...(field.arguments ??[]), ...argumentAdditions];
    }
  }

  (field.arguments as InputValueDefinitionNode[] | undefined) = field.arguments?.map((argumentNode => patchFieldArgument(typeName, field.name.value, argumentNode, changes)));

  return field;
}

function patchFieldArgument(typeName: string, fieldName: string, arg: InputValueDefinitionNode, changes: ChangesByType) {
  const descriptionChanges = (changes[ChangeType.FieldArgumentDescriptionChanged] ?? []).filter(change => change.meta.typeName === typeName && change.meta.fieldName === fieldName);
  for (const change of descriptionChanges) {
    if (arg.description?.value !== (change.meta.oldDescription ?? undefined)) {
      console.warn('Conflict: Description does not match previous change description.');
      continue;
    }
    (arg.description as StringValueNode | undefined) = change.meta.newDescription ? {
      kind: Kind.STRING,
      ...arg.description,
      value: change.meta.newDescription,
    } : undefined;
  }

  return arg;
}

function patchInputObject(node: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchUnionType(node: UnionTypeDefinitionNode | UnionTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchScalarType(node: ScalarTypeDefinitionNode | ScalarTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchEnumType(node: EnumTypeDefinitionNode | EnumTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchDirective(node: DirectiveDefinitionNode, changes: ChangesByType) {
  return node;
}

// function patchField(typeNode: ObjectTypeDefinitionNode | ObjectTypeExtensionNode, fieldName: string, patch: (field: FieldDefinitionNode) => void) {
//   switch (typeNode.kind) {
//     // case Kind.DIRECTIVE_DEFINITION: {
//     //   const arg = typeNode.arguments?.find(a => a.name.value === argumentName);
//     //   if (!arg) {
//     //     console.warn(`Conflict: Cannot patch missing argument ${argumentName}`)
//     //     break;
//     //   }
//     //   patch(arg);
//     //   break;
//     // }
//     case Kind.OBJECT_TYPE_DEFINITION:
//     case Kind.OBJECT_TYPE_EXTENSION: {
//       const field = (typeNode.fields ?? []).find(f => f.name.value === fieldName);
//       if (field) {
//         patch(field);
//       } else {
//         console.warn(`Conflict: Cannot patch missing field ${typeNode.name.value}.${fieldName}`);
//       }
//       break;
//     }
//   }
// }

// function patchFieldArgument(typeNode: ObjectTypeDefinitionNode | ObjectTypeExtensionNode, fieldName: string, argumentName: string, patch: (arg: InputValueDefinitionNode) => void) {
//   patchField(typeNode, fieldName, (field) => {
//     const arg = field?.arguments?.find(a => a.name.value === argumentName);
//     if (arg) {
//       patch(arg);
//     } else {
//       console.warn(`Conflict: Cannot patch missing argument ${argumentName}`)
//     }
//   })
// }

type ChangesByType = { [key in TypeOfChangeType]?: Array<Change<key>> };

export function patch(ast: DocumentNode, changes: SerializableChange[]): DocumentNode {
  // const [schemaDefs, nodesByName] = collectDefinitions(ast);
  const changesByType: ChangesByType = {};
  for (const change of changes) {
    changesByType[change.type] ??= [];
    changesByType[change.type]?.push(change as any);
  }

  const result = visit(ast, {
    ObjectTypeDefinition: (node) => patchObjectType(node, changesByType),
    ObjectTypeExtension: (node) => patchObjectType(node, changesByType),
    InterfaceTypeDefinition: (node) => patchObjectType(node, changesByType),
    InterfaceTypeExtension: (node) => patchObjectType(node, changesByType),
    InputObjectTypeDefinition: (node) => patchInputObject(node, changesByType),
    InputObjectTypeExtension: (node) => patchInputObject(node, changesByType),
    UnionTypeDefinition: (node) => patchUnionType(node, changesByType),
    UnionTypeExtension: (node) => patchUnionType(node, changesByType),
    ScalarTypeDefinition: (node) => patchScalarType(node, changesByType),
    ScalarTypeExtension: (node) => patchScalarType(node, changesByType),
    EnumTypeDefinition: (node) => patchEnumType(node, changesByType),
    EnumTypeExtension: (node) => patchEnumType(node, changesByType),
    DirectiveDefinition: (node) => patchDirective(node, changesByType),
    SchemaDefinition: (node) => node,
    SchemaExtension: (node) => node,
  });

  return {
    ...result,
    definitions: [
      ...result.definitions,

      /** ADD TYPES */
      ...(changesByType[ChangeType.TypeAdded] ?? [])
        // @todo consider what to do for types that already exist.
        .map(addition =>({
          kind: Kind.OBJECT_TYPE_DEFINITION,
          fields: [],
          name: nameNode(addition.meta.addedTypeName),
        } as ObjectTypeDefinitionNode)),
    ],
  };

  // -------------------

  // const getTypeNodeSafe = <K extends Kind>(typeName: string, kinds: K[]): ASTKindToNode[K] | undefined => {
  //   const typeNode = nodesByName.get(typeName);
  //   if (!typeNode) {
  //     console.warn(`Conflict: Cannot apply change to missing type ${typeName}`)
  //     return;
  //   }

  //   if (typeNode.kind in kinds) {
  //     return typeNode as ASTKindToNode[K];
  //   }

  //   console.warn(`Conflict: Cannot apply change. Type ${typeName} node is an unexpected kind ${typeNode.kind}`);
  // }
  // for (const change of changes) {
  //   switch (change.type) {
  //     case 'FIELD_ARGUMENT_DESCRIPTION_CHANGED': {
        
  //       break;
  //     }
  //     case 'FIELD_ARGUMENT_DEFAULT_CHANGED': {
  //       const typeNode = getTypeNodeSafe(change.meta.typeName, [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION])
  //       if (typeNode) {
  //         patchFieldArgument(typeNode, change.meta.fieldName, change.meta.argumentName, (arg) => {
  //           if (arg.defaultValue === undefined) {
  //             if (change.meta.oldDefaultValue !== undefined) {
  //               console.warn(`Conflict: Default value "${arg.defaultValue}" does not match previous change default value of "${change.meta.oldDefaultValue}".`);
  //               return;
  //             }
  //           } else if (print(arg.defaultValue) !== (change.meta.oldDefaultValue)) {
  //             console.warn(`Conflict: Default value "${print(arg.defaultValue)}" does not match previous change default value of "${change.meta.oldDefaultValue}".`);
  //             return;
  //           }

  //           const defaultValue = change.meta.newDefaultValue ? astFromValue(change.meta.newDefaultValue, GraphQLString) : undefined;
  //           ((arg as InputValueDefinitionNode).defaultValue as ValueNode | undefined) = defaultValue ?? undefined;
  //         });
  //       }
  //       break;
  //     }
  //     case 'FIELD_ARGUMENT_TYPE_CHANGED': {
  //       const typeNode = getTypeNodeSafe(change.meta.typeName, [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION])
  //       if (typeNode) {
  //         patchFieldArgument(typeNode, change.meta.fieldName, change.meta.argumentName, (arg) => {
  //           if (print(arg.type) !== (change.meta.oldArgumentType)) {
  //             console.warn(`Conflict: Argument ${location} type "${print(arg.type)}" does not match previous change type of "${change.meta.oldArgumentType}".`);
  //             return;
  //           }

  //           const argType = getTypeNodeSafe(change.meta.newArgumentType, [Kind.NAMED_TYPE, Kind.LIST_TYPE, Kind.NON_NULL_TYPE]);
  //           if (argType) {
  //             ((arg as InputValueDefinitionNode).type as TypeNode) = argType;
  //           } else {
  //             console.warn(`Conflict: Argument type cannot be changed to missing type "${change.meta.newArgumentType}"`)
  //           }
  //         });
  //       }
  //       break;
  //     }
  //     case 'DIRECTIVE_REMOVED':
  //     case 'DIRECTIVE_ADDED':
  //     case 'DIRECTIVE_DESCRIPTION_CHANGED':
  //     case 'DIRECTIVE_LOCATION_ADDED':
  //     case 'DIRECTIVE_LOCATION_REMOVED':
  //     case 'DIRECTIVE_ARGUMENT_ADDED':
  //     case 'DIRECTIVE_ARGUMENT_REMOVED':
  //     case 'DIRECTIVE_ARGUMENT_DESCRIPTION_CHANGED':
  //     case 'DIRECTIVE_ARGUMENT_DEFAULT_VALUE_CHANGED':
  //     case 'DIRECTIVE_ARGUMENT_TYPE_CHANGED':
  //     case 'ENUM_VALUE_REMOVED':
  //     case 'ENUM_VALUE_ADDED':
  //     case 'ENUM_VALUE_DESCRIPTION_CHANGED':
  //     case 'ENUM_VALUE_DEPRECATION_REASON_CHANGED':
  //     case 'ENUM_VALUE_DEPRECATION_REASON_ADDED':
  //     case 'ENUM_VALUE_DEPRECATION_REASON_REMOVED':
  //     case 'FIELD_REMOVED':
  //     case 'FIELD_ADDED':
  //     case 'FIELD_DESCRIPTION_CHANGED':
  //     case 'FIELD_DESCRIPTION_ADDED':
  //     case 'FIELD_DESCRIPTION_REMOVED':
  //     case 'FIELD_DEPRECATION_ADDED':
  //     case 'FIELD_DEPRECATION_REMOVED':
  //     case 'FIELD_DEPRECATION_REASON_CHANGED':
  //     case 'FIELD_DEPRECATION_REASON_ADDED':
  //     case 'FIELD_DEPRECATION_REASON_REMOVED':
  //     case 'FIELD_TYPE_CHANGED':
  //     case 'FIELD_ARGUMENT_ADDED':
  //     case 'FIELD_ARGUMENT_REMOVED':
  //     case 'INPUT_FIELD_REMOVED':
  //     case 'INPUT_FIELD_ADDED':
  //     case 'INPUT_FIELD_DESCRIPTION_ADDED':
  //     case 'INPUT_FIELD_DESCRIPTION_REMOVED':
  //     case 'INPUT_FIELD_DESCRIPTION_CHANGED':
  //     case 'INPUT_FIELD_DEFAULT_VALUE_CHANGED':
  //     case 'INPUT_FIELD_TYPE_CHANGED':
  //     case 'OBJECT_TYPE_INTERFACE_ADDED':
  //     case 'OBJECT_TYPE_INTERFACE_REMOVED':
  //     case 'SCHEMA_QUERY_TYPE_CHANGED':
  //     case 'SCHEMA_MUTATION_TYPE_CHANGED':
  //     case 'SCHEMA_SUBSCRIPTION_TYPE_CHANGED':
  //     case 'TYPE_REMOVED':
  //     case 'TYPE_ADDED':
  //     case 'TYPE_KIND_CHANGED':
  //     case 'TYPE_DESCRIPTION_CHANGED':
  //     case 'TYPE_DESCRIPTION_REMOVED':
  //     case 'TYPE_DESCRIPTION_ADDED':
  //     case 'UNION_MEMBER_REMOVED':
  //     case 'UNION_MEMBER_ADDED':
  //     case 'DIRECTIVE_USAGE_UNION_MEMBER_ADDED':
  //     case 'DIRECTIVE_USAGE_UNION_MEMBER_REMOVED':
  //     case 'DIRECTIVE_USAGE_ENUM_ADDED':
  //     case 'DIRECTIVE_USAGE_ENUM_REMOVED':
  //     case 'DIRECTIVE_USAGE_ENUM_VALUE_ADDED':
  //     case 'DIRECTIVE_USAGE_ENUM_VALUE_REMOVED':
  //     case 'DIRECTIVE_USAGE_INPUT_OBJECT_ADDED':
  //     case 'DIRECTIVE_USAGE_INPUT_OBJECT_REMOVED':
  //     case 'DIRECTIVE_USAGE_FIELD_ADDED':
  //     case 'DIRECTIVE_USAGE_FIELD_REMOVED':
  //     case 'DIRECTIVE_USAGE_SCALAR_ADDED':
  //     case 'DIRECTIVE_USAGE_SCALAR_REMOVED':
  //     case 'DIRECTIVE_USAGE_OBJECT_ADDED':
  //     case 'DIRECTIVE_USAGE_OBJECT_REMOVED':
  //     case 'DIRECTIVE_USAGE_INTERFACE_ADDED':
  //     case 'DIRECTIVE_USAGE_INTERFACE_REMOVED':
  //     case 'DIRECTIVE_USAGE_ARGUMENT_DEFINITION_ADDED':
  //     case 'DIRECTIVE_USAGE_ARGUMENT_DEFINITION_REMOVED':
  //     case 'DIRECTIVE_USAGE_SCHEMA_ADDED':
  //     case 'DIRECTIVE_USAGE_SCHEMA_REMOVED':
  //     case 'DIRECTIVE_USAGE_FIELD_DEFINITION_ADDED':
  //     case 'DIRECTIVE_USAGE_FIELD_DEFINITION_REMOVED':
  //     case 'DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_ADDED':
  //     case 'DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_REMOVED': {
  //       break;
  //     }
  //     default: {
  //       console.error('Unhandled change type. Check package version compatibility.')
  //     }
  //   }
  // }

  // const newAst: DocumentNode = {
  //   kind: Kind.DOCUMENT,
  //   definitions: [...schemaDefs, ...nodesByName.values()],
  // };
  // return newAst;
}

// export function printDiff(before: DocumentNode, changes: SerializableChange[]): string {
//   // WHAT IF
//   /**
//    * modify ast to include a flag for added, removed, or updated/moved?...
//    * add everything to the AST and print that as a schema.. (but it wont print duplicate field names etc right)
//    * ... So write a custom printer that solves^
//    * 
//    * HOW do keep the removed node around and not mess up the AST?...
//    */
  
//   return '';
// }