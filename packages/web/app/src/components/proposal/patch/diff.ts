import { Change, SerializableChange, ChangeType } from '@graphql-inspector/core';
import { GraphQLSchema, printSchema, parse, DocumentNode, Kind, buildASTSchema, NameNode, ObjectTypeDefinitionNode, FieldDefinitionNode, ASTKindToNode, InterfaceTypeDefinitionNode, SchemaDefinitionNode, SchemaExtensionNode, ExecutableDefinitionNode, print, InputValueDefinitionNode, StringValueNode, ObjectTypeExtensionNode, DirectiveDefinitionNode, TypeExtensionNode, TypeDefinitionNode, TypeSystemDefinitionNode, ValueNode, astFromValue, GraphQLString, TypeNode, InterfaceTypeExtensionNode, InputObjectTypeDefinitionNode, InputObjectTypeExtensionNode, UnionTypeDefinitionNode, UnionTypeExtensionNode, ScalarTypeDefinitionNode, ScalarTypeExtensionNode, EnumTypeDefinitionNode, EnumTypeExtensionNode, visit, parseType, ArgumentNode, parseValue, EnumValueDefinitionNode, DirectiveNode, GraphQLDeprecatedDirective, NamedTypeNode } from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';

export type TypeOfChangeType = (typeof ChangeType)[keyof typeof ChangeType];

function nameNode(name: string): NameNode {
  return {
    value: name,
    kind: Kind.NAME,
  };
}

function stringNode(value: string): StringValueNode {
  return {
    kind: Kind.STRING,
    value,
  }
}

export function patchSchema(schema: GraphQLSchema, changes: SerializableChange[]): GraphQLSchema {
  const ast = parse(printSchema(schema));
  return buildASTSchema(patch(ast, changes), { assumeValid: true, assumeValidSDL: true });
}

export function patchTypeDefinition<T extends TypeDefinitionNode>(node: T, changes: ChangesByType): T {
  /** CHANGE DESCRIPTION */
  {
    const change = changes[ChangeType.TypeDescriptionAdded]?.findLast(({ meta }) => meta.typeName === node.name.value);
    if (change) {
      (node.description as StringValueNode) = stringNode(change.meta.addedTypeDescription);
    }
  }
  {
    const change = changes[ChangeType.TypeDescriptionChanged]?.findLast(({ meta }) => meta.typeName === node.name.value);
    if (change) {
      (node.description as StringValueNode) = stringNode(change.meta.newTypeDescription);
    }
  }
  {
    const change = changes[ChangeType.TypeDescriptionRemoved]?.findLast(({ meta }) => meta.typeName === node.name.value);
    if (change) {
      (node.description as StringValueNode | undefined) = undefined;
    }
  }
  return node
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

  /** REMOVE INTERFACES */
  {
    const removals = changes[ChangeType.ObjectTypeInterfaceRemoved]
      ?.filter(change => change.meta.objectTypeName === node.name.value)
      .map(node => node.meta.removedInterfaceName);
    (node.interfaces as NamedTypeNode[] | undefined) = node.interfaces?.filter(({ name }) => !removals?.includes(name.value));
  }

  /** ADD INTERFACES */
  {
    const additions = changes[ChangeType.ObjectTypeInterfaceAdded]
      ?.filter(change => change.meta.objectTypeName === node.name.value)
      .map(node => node.meta.addedInterfaceName);
    if (additions) {
      (node.interfaces as NamedTypeNode[]) = [
        ...node.interfaces ?? [],
        ...additions.map((name): NamedTypeNode => ({
          kind: Kind.NAMED_TYPE,
          name: nameNode(name),
        })),
      ];
    }
  }

  return node;
}

function patchField(typeName: string, field: FieldDefinitionNode, changes: ChangesByType) {
  {
    const change = changes[ChangeType.FieldDescriptionAdded]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      (field.description as StringValueNode) = stringNode(change.meta.addedDescription);
    }
  }

  {
    const change = changes[ChangeType.FieldDescriptionChanged]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      (field.description as StringValueNode) = stringNode(change.meta.newDescription);
    }
  }

  {
    const change = changes[ChangeType.FieldDescriptionRemoved]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change && field.description) {
      (field.description as StringValueNode | undefined) = undefined;
    }
  }

  {
    const change = changes[ChangeType.FieldTypeChanged]?.findLast(change => change.meta.typeName === typeName && field.name.value === change.meta.fieldName);
    if (change) {
      (field.type as TypeNode) = parseType(change.meta.newFieldType);
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

  const patchedArguments = field.arguments
    ?.map((argumentNode => patchFieldArgument(typeName, field.name.value, argumentNode, changes)))
    .filter(n => !!n);
  const addedArguments = changes[ChangeType.FieldArgumentAdded]
    ?.filter(change => change.meta.typeName === typeName && change.meta.fieldName === field.name.value)
    .map((change): InputValueDefinitionNode => ({
      kind: Kind.INPUT_VALUE_DEFINITION,
      name: nameNode(change.meta.addedArgumentName),
      type: parseType(change.meta.addedArgumentType),
      // @todo handle default value and description etc.
    }));
  const fieldArgs = [...patchedArguments ?? [], ...addedArguments ?? []];
  (field.arguments as InputValueDefinitionNode[] | undefined) = fieldArgs.length ? fieldArgs : undefined;

  return field;
}

function patchFieldArgument(typeName: string, fieldName: string, arg: InputValueDefinitionNode, changes: ChangesByType) {
  const descriptionChanges = (changes[ChangeType.FieldArgumentDescriptionChanged] ?? []).filter(change => change.meta.typeName === typeName && change.meta.fieldName === fieldName);
  for (const change of descriptionChanges) {
    if (arg.description?.value !== (change.meta.oldDescription ?? undefined)) {
      console.warn('Conflict: Description does not match previous change description.');
      continue;
    }
    (arg.description as StringValueNode | undefined) = change.meta.newDescription ? stringNode(change.meta.newDescription) : undefined;
  }

  const defaultChanges = (changes[ChangeType.FieldArgumentDefaultChanged] ?? []).filter(change => change.meta.typeName === typeName && change.meta.fieldName === fieldName);;
  for (const change of defaultChanges) {
    if (arg.defaultValue === undefined) {
      if (change.meta.oldDefaultValue !== undefined) {
        console.warn(`Conflict: Default value "${arg.defaultValue}" does not match previous change default value of "${change.meta.oldDefaultValue}".`);
        return;
      }
    } else if (print(arg.defaultValue) !== (change.meta.oldDefaultValue)) {
      console.warn(`Conflict: Default value "${print(arg.defaultValue)}" does not match previous change default value of "${change.meta.oldDefaultValue}".`);
      return;
    }
    ((arg as InputValueDefinitionNode).defaultValue as ValueNode | undefined) = change.meta.newDefaultValue ? parseValue(change.meta.newDefaultValue) : undefined;
  }

  const removalChange = (changes[ChangeType.FieldArgumentRemoved] ?? []).find(change => change.meta.typeName === typeName && change.meta.fieldName === fieldName && change.meta.removedFieldArgumentName === arg.name.value);;
  if (removalChange) {
    return null;
  }

  return arg;
}

function patchInputObject(node: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchUnionType(node: UnionTypeDefinitionNode | UnionTypeExtensionNode, changes: ChangesByType) {
  return node;
}

function patchEnumType(node: EnumTypeDefinitionNode | EnumTypeExtensionNode, changes: ChangesByType) {
  {
    const removals = changes[ChangeType.EnumValueRemoved]?.filter(change => change.meta.enumName === node.name.value)
      .map(change => change.meta.removedEnumValueName);
    (node.values as EnumValueDefinitionNode[] | undefined) = node.values?.filter(({ name }) => !removals?.includes(name.value))
  }

  {
    const additions = changes[ChangeType.EnumValueAdded]?.filter(change => change.meta.enumName === node.name.value)
      .map((change): EnumValueDefinitionNode => ({
        kind: Kind.ENUM_VALUE_DEFINITION,
        name: nameNode(change.meta.addedEnumValueName),
        // @todo
        directives: undefined,
        description: undefined,
      }));
    if (additions?.length) {
      (node.values as EnumValueDefinitionNode[] | undefined) = [...node.values ?? [], ...additions];
    }
  }

  /** CHANGED VALUE DESCRIPTION */
  {
    const change = changes[ChangeType.EnumValueDescriptionChanged]?.findLast(change => change.meta.enumName === node.name.value);
    if (change) {
      (node.values as EnumValueDefinitionNode[] | undefined)?.map(value => {
        if (value.name.value === change.meta.enumValueName) {
          (value.description as StringValueNode | undefined) = change.meta.newEnumValueDescription ? stringNode(change.meta.newEnumValueDescription) : undefined;
        }
      });
    }
  }

  {
    const addedChanges = changes[ChangeType.EnumValueDeprecationReasonChanged]?.filter(change => change.meta.enumName === node.name.value);
    for (const change of addedChanges ?? []) {
      const enumValueNode = findNamedNode(node.values, change.meta.enumValueName)
      const deprecation = getDeprecatedDirectiveNode(enumValueNode);
      setArgument(deprecation, 'reason', stringNode(change.meta.newEnumValueDeprecationReason));
    }
  }

  {
    const addedChanges = changes[ChangeType.EnumValueDeprecationReasonAdded]?.filter(change => change.meta.enumName === node.name.value);
    for (const change of addedChanges ?? []) {
      const enumValueNode = findNamedNode(node.values, change.meta.enumValueName)
      const deprecation = getDeprecatedDirectiveNode(enumValueNode);
      setArgument(deprecation, 'reason', stringNode(change.meta.addedValueDeprecationReason));
    }
  }

  {
    const removalChanges = changes[ChangeType.EnumValueDeprecationReasonRemoved]
      ?.filter(change => change.meta.enumName === node.name.value);
    for (const change of removalChanges ?? []) {
        const enumValueNode = findNamedNode(node.values, change.meta.enumValueName)
        const deprecation = getDeprecatedDirectiveNode(enumValueNode);
        removeArgument(deprecation, 'reason');
      }
  }

  return node;
}

function patchDirective(node: DirectiveDefinitionNode, changes: ChangesByType) {

  return node;
}

type ChangesByType = { [key in TypeOfChangeType]?: Array<Change<key>> };

export function patch(ast: DocumentNode, changes: SerializableChange[]): DocumentNode {
  // const [schemaDefs, nodesByName] = collectDefinitions(ast);
  const changesByType: ChangesByType = {};
  for (const change of changes) {
    changesByType[change.type] ??= [];
    changesByType[change.type]?.push(change as any);
  }

  const result = visit(ast, {
    ObjectTypeDefinition: (node) => patchObjectType(patchTypeDefinition(node, changesByType), changesByType),
    ObjectTypeExtension: (node) => patchObjectType(node, changesByType),
    InterfaceTypeDefinition: (node) => patchObjectType(patchTypeDefinition(node, changesByType), changesByType),
    InterfaceTypeExtension: (node) => patchObjectType(node, changesByType),
    InputObjectTypeDefinition: (node) => patchInputObject(patchTypeDefinition(node, changesByType), changesByType),
    InputObjectTypeExtension: (node) => patchInputObject(node, changesByType),
    UnionTypeDefinition: (node) => patchUnionType(patchTypeDefinition(node, changesByType), changesByType),
    UnionTypeExtension: (node) => patchUnionType(node, changesByType),
    ScalarTypeDefinition: (node) => patchTypeDefinition(node, changesByType),
    // ScalarTypeExtension: (node) => patchScalarType(node, changesByType),
    EnumTypeDefinition: (node) => patchEnumType(patchTypeDefinition(node, changesByType), changesByType),
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
        .map((addition): TypeDefinitionNode => {
          // addition.meta.addedTypeKind
          // @todo need to figure out how to add enums and other types...
          return {
            kind: Kind.OBJECT_TYPE_DEFINITION,
            fields: [],
            name: nameNode(addition.meta.addedTypeName),
          } as ObjectTypeDefinitionNode
        }),
    ],
  };
}

function getDeprecatedDirectiveNode(
  definitionNode: Maybe<{ readonly directives?: ReadonlyArray<DirectiveNode> }>,
): Maybe<DirectiveNode> {
  return definitionNode?.directives?.find(
    (node) => node.name.value === GraphQLDeprecatedDirective.name,
  );
}

function setArgument(
  node: Maybe<{ arguments?: ArgumentNode[] | readonly ArgumentNode[] | undefined}>,
  argumentName: string,
  value: ValueNode,
): void {
  if (node) {
    let found = false;
    for (const arg of node.arguments ?? []) {
      if (arg.name.value === argumentName) {
        (arg.value as ValueNode) = value;
        found = true;
        break;
      }
    }
    if (!found) {
      node.arguments = [...(node.arguments ?? []), {
        kind: Kind.ARGUMENT,
        name: nameNode(argumentName),
        value,
      }]
    }
  }
}

function findNamedNode<T extends { readonly name: NameNode; }>(
  nodes: Maybe<ReadonlyArray<T>>,
  name: string,
): T | undefined {
  return nodes?.find(value => value.name.value === name);
}

function removeArgument(
  node: Maybe<{ arguments?: ArgumentNode[] | readonly ArgumentNode[] | undefined}>,
  argumentName: string,
): void {
  if (node?.arguments) {
    node.arguments = node.arguments.filter(arg => arg.name.value !== argumentName);
  }
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