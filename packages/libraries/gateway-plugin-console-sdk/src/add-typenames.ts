import {
  getNamedType,
  isAbstractType,
  isCompositeType,
  isInterfaceType,
  isObjectType,
  Kind,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  type DocumentNode,
  type FieldNode,
  type GraphQLCompositeType,
  type GraphQLSchema,
  type InlineFragmentNode,
  type SelectionSetNode,
} from 'graphql';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

const TYPENAME_FIELD: FieldNode = {
  kind: Kind.FIELD,
  name: { kind: Kind.NAME, value: '__typename' },
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
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  let definitionsChanged = false;
  const defs = document.definitions;
  const len = defs.length;

  let newDefs: Mutable<typeof defs> | null = null;

  for (let i = 0; i < len; i++) {
    const def = defs[i];
    let newDef = def;

    if (def.kind === Kind.OPERATION_DEFINITION) {
      const rootType =
        def.operation === 'query'
          ? queryType
          : def.operation === 'mutation'
            ? mutationType
            : subscriptionType;

      if (rootType) {
        const newSelectionSet = walkSelectionSet(def.selectionSet, rootType, false, schema);
        if (newSelectionSet !== def.selectionSet) {
          newDef = { ...def, selectionSet: newSelectionSet };
        }
      }
    } else if (def.kind === Kind.FRAGMENT_DEFINITION) {
      const onType = schema.getType(def.typeCondition.name.value);
      if (onType && isCompositeType(onType)) {
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
        newDefs = defs.slice(0, i);
      }
    }

    if (definitionsChanged) {
      newDefs!.push(newDef);
    }
  }

  if (!definitionsChanged) {
    return document;
  }

  return {
    ...document,
    definitions: newDefs!,
  };
}

function walkSelectionSet(
  selectionSet: SelectionSetNode,
  parentType: GraphQLCompositeType,
  parentIsAbstract: boolean,
  schema: GraphQLSchema,
): SelectionSetNode {
  const thisTypeIsAbstract = isAbstractType(parentType);
  const mightNeedTypename = thisTypeIsAbstract || (parentIsAbstract && isObjectType(parentType));

  let hasTypename = false;
  let selectionsChanged = false;

  const selections = selectionSet.selections;
  const len = selections.length;

  let newSelections: Mutable<typeof selections> | null = null;

  for (let i = 0; i < len; i++) {
    const selection = selections[i];
    let newSelection = selection;

    if (selection.kind === Kind.FIELD) {
      if (mightNeedTypename && !hasTypename && selection.name.value === '__typename') {
        hasTypename = true;
      }

      if (selection.selectionSet) {
        const fieldDef = getFieldDef(schema, parentType, selection);
        if (fieldDef) {
          const fieldType = getNamedType(fieldDef.type);
          if (fieldType && isCompositeType(fieldType)) {
            const newChildSelectionSet = walkSelectionSet(
              selection.selectionSet,
              fieldType,
              isAbstractType(fieldType),
              schema,
            );

            if (newChildSelectionSet !== selection.selectionSet) {
              newSelection = { ...selection, selectionSet: newChildSelectionSet } as FieldNode;
            }
          }
        }
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const branchType = selection.typeCondition
        ? schema.getType(selection.typeCondition.name.value)
        : parentType;

      if (branchType && isCompositeType(branchType)) {
        const newChildSelectionSet = walkSelectionSet(
          selection.selectionSet,
          branchType,
          thisTypeIsAbstract || parentIsAbstract,
          schema,
        );

        if (newChildSelectionSet !== selection.selectionSet) {
          newSelection = { ...selection, selectionSet: newChildSelectionSet } as InlineFragmentNode;
        }
      }
    }

    if (newSelection !== selection) {
      if (!selectionsChanged) {
        selectionsChanged = true;
        newSelections = selections.slice(0, i);
      }
    }

    if (selectionsChanged) {
      newSelections!.push(newSelection);
    }
  }

  const needsTypename = mightNeedTypename && !hasTypename;

  if (!selectionsChanged && !needsTypename) {
    return selectionSet;
  }

  // If we only need to append __typename but no children changed, we clone the array here.
  const finalSelections = selectionsChanged ? newSelections! : selections.slice();

  if (needsTypename) {
    finalSelections.push(TYPENAME_FIELD);
  }

  return {
    ...selectionSet,
    selections: finalSelections,
  };
}

function getFieldDef(schema: GraphQLSchema, parentType: GraphQLCompositeType, field: FieldNode) {
  const name = field.name.value;

  if (name === '__typename') return TypeNameMetaFieldDef;

  if (name === '__schema' || name === '__type') {
    if (parentType === schema.getQueryType()) {
      return name === '__schema' ? SchemaMetaFieldDef : TypeMetaFieldDef;
    }
  }

  if (isObjectType(parentType) || isInterfaceType(parentType)) {
    return parentType.getFields()[name] ?? null;
  }

  return null;
}
