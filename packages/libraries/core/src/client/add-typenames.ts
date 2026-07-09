import {
  DefinitionNode,
  getNamedType,
  isAbstractType,
  isCompositeType,
  isObjectType,
  SelectionNode,
  type DocumentNode,
  type FieldNode,
  type GraphQLCompositeType,
  type GraphQLSchema,
  type InlineFragmentNode,
  type Kind, // in order to support older graphql versions, do not rely on Kind for runtime
  type SelectionSetNode,
} from 'graphql';

const TYPENAME_FIELD: FieldNode = {
  kind: 'Field' as Kind.FIELD,
  name: { kind: 'Name' as Kind.NAME, value: '__typename' },
};

/**
 * Recursively adds __typename to every selection set whose parent type is
 * abstract (union or interface), or whose parent type is a concrete object
 * type that implements an abstract type (i.e. it appears as a possible type
 * of some interface or union in the schema).
 *
 * Requires the schema so it can resolve field return types as it walks the
 * document tree.
 */
export function addTypenames(document: DocumentNode, schema: GraphQLSchema): DocumentNode {
  let definitionsChanged = false;
  let newDefinitions: DefinitionNode[] | null = null;

  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    let newDef = def;

    if (def.kind === 'OperationDefinition') {
      const rootType =
        def.operation === 'query'
          ? schema.getQueryType()
          : def.operation === 'mutation'
            ? schema.getMutationType()
            : schema.getSubscriptionType();

      if (rootType) {
        const newSelectionSet = walkSelectionSet(def.selectionSet, rootType, false, schema);
        if (newSelectionSet !== def.selectionSet) {
          newDef = { ...def, selectionSet: newSelectionSet };
        }
      }
    } else if (def.kind === 'FragmentDefinition') {
      const onType = schema.getType(def.typeCondition.name.value);

      if (isCompositeType(onType)) {
        const newSelectionSet = walkSelectionSet(
          def.selectionSet,
          onType,
          isAbstractType(onType),
          schema,
        );
        if (newSelectionSet !== def.selectionSet) {
          newDef = { ...def, selectionSet: newSelectionSet };
        }
      }
    }

    if (newDef !== def) {
      if (!definitionsChanged) {
        definitionsChanged = true;
        newDefinitions = document.definitions.slice(0, i);
      }
    }

    if (definitionsChanged && newDefinitions) {
      newDefinitions.push(newDef);
    }
  }

  if (!definitionsChanged) {
    return document;
  }

  return {
    ...document,
    definitions: newDefinitions!,
  };
}

function walkSelectionSet(
  selectionSet: SelectionSetNode,
  parentType: GraphQLCompositeType,
  parentIsAbstract: boolean,
  schema: GraphQLSchema,
): SelectionSetNode {
  const thisTypeIsAbstract = isAbstractType(parentType);
  const checkTypename =
    thisTypeIsAbstract ||
    (parentIsAbstract && isObjectType(parentType) && parentType.getInterfaces().length > 0);

  let selectionsChanged = false;
  let newSelections: SelectionNode[] | null = null;
  let hasTypename = false;

  const selections = selectionSet.selections;

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    let newSelection = selection;

    if (selection.kind === 'Field') {
      if (checkTypename && selection.name.value === '__typename') {
        hasTypename = true;
      }

      if (selection.selectionSet) {
        const fieldDef = getFieldDef(parentType, selection);
        if (fieldDef) {
          const fieldType = getNamedType(fieldDef.type);
          if (isCompositeType(fieldType)) {
            const newSelectionSet = walkSelectionSet(
              selection.selectionSet,
              fieldType,
              isAbstractType(fieldType),
              schema,
            );

            if (newSelectionSet !== selection.selectionSet) {
              newSelection = {
                ...selection,
                selectionSet: newSelectionSet,
              } satisfies FieldNode;
            }
          }
        }
      }
    } else if (selection.kind === 'InlineFragment') {
      const branchType = selection.typeCondition
        ? schema.getType(selection.typeCondition.name.value)
        : parentType;

      if (isCompositeType(branchType)) {
        const newSelectionSet = walkSelectionSet(
          selection.selectionSet,
          branchType,
          isAbstractType(branchType),
          schema,
        );

        if (newSelectionSet !== selection.selectionSet) {
          newSelection = {
            ...selection,
            selectionSet: newSelectionSet,
          } satisfies InlineFragmentNode;
        }
      }
    }

    if (newSelection !== selection) {
      if (!selectionsChanged) {
        selectionsChanged = true;
        // This logic avoids copying the selection list before it's absolutely necessary.
        // Therefore, no additional memory will be wasted copying when iterating over
        // concrete, non-implementing object types.
        newSelections = selections.slice(0, i);
      }
    }

    if (selectionsChanged && newSelections) {
      newSelections.push(newSelection);
    }
  }

  const needsTypename = checkTypename && !hasTypename;
  if (!needsTypename && !selectionsChanged) {
    return selectionSet;
  }
  const finalSelections = selectionsChanged && newSelections ? newSelections : [...selections];
  if (needsTypename) {
    finalSelections.push(TYPENAME_FIELD);
  }

  return {
    ...selectionSet,
    selections: finalSelections,
  };
}

function getFieldDef(parentType: GraphQLCompositeType, field: FieldNode) {
  const name = field.name.value;
  // ignore internal fields like __schema, __type, and __typename
  if (name.startsWith('__')) {
    return null;
  }

  return 'getFields' in parentType ? (parentType.getFields()[name] ?? null) : null;
}
