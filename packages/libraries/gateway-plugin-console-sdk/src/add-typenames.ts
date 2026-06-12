import {
  getNamedType,
  isAbstractType,
  isCompositeType,
  isObjectType,
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

  const augmentedDefinitions = document.definitions.map(def => {
    if (def.kind === 'OperationDefinition') {
      const rootType =
        def.operation === 'query'
          ? schema.getQueryType()
          : def.operation === 'mutation'
            ? schema.getMutationType()
            : schema.getSubscriptionType();

      if (!rootType) return def;

      const newSelectionSet = walkSelectionSet(def.selectionSet, rootType, false, schema);
      if (newSelectionSet !== def.selectionSet) {
        definitionsChanged = true;
        return {
          ...def,
          selectionSet: newSelectionSet,
        };
      }
      return def;
    }

    if (def.kind === 'FragmentDefinition') {
      const onType = schema.getType(def.typeCondition.name.value);
      const typeIsAbstract = isAbstractType(onType);
      // This check is equivalent to graphqljs' "isCompositeType", but it means we dont need
      // to recheck for if the type is abstract. This is a minor efficiency thing.
      if (!typeIsAbstract && !isObjectType(onType)) return def;

      const newSelectionSet = walkSelectionSet(def.selectionSet, onType, typeIsAbstract, schema);
      if (newSelectionSet !== def.selectionSet) {
        definitionsChanged = true;
        return {
          ...def,
          selectionSet: newSelectionSet,
        };
      }
      return def;
    }

    return def;
  });

  if (!definitionsChanged) {
    return document;
  }

  return {
    ...document,
    definitions: augmentedDefinitions,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @param parentIsAbstract - true when the immediately enclosing field (or
 * fragment condition) resolved to an abstract type. This is propagated into
 * concrete inline-fragment branches so they also receive __typename.
 */
function walkSelectionSet(
  selectionSet: SelectionSetNode,
  parentType: GraphQLCompositeType,
  parentIsAbstract: boolean,
  schema: GraphQLSchema,
): SelectionSetNode {
  const thisTypeIsAbstract = isAbstractType(parentType);
  const needsTypename =
    (thisTypeIsAbstract ||
      (parentIsAbstract && isObjectType(parentType) && parentType.getInterfaces().length > 0)) &&
    !selectionSet.selections.some(s => s.kind === 'Field' && s.name.value === '__typename');

  let selectionsChanged = false;

  const augmentedSelections = selectionSet.selections.map(selection => {
    if (selection.kind === 'Field') {
      if (!selection.selectionSet) {
        return selection; // Scalar or enum leaf.
      }

      const fieldDef = getFieldDef(parentType, selection);
      if (!fieldDef) return selection;

      const fieldType = getNamedType(fieldDef.type);
      if (!isCompositeType(fieldType)) return selection;

      const newSelectionSet = walkSelectionSet(
        selection.selectionSet,
        fieldType,
        isAbstractType(fieldType),
        schema,
      );

      if (newSelectionSet !== selection.selectionSet) {
        selectionsChanged = true;
        return {
          ...selection,
          selectionSet: newSelectionSet,
        } satisfies FieldNode;
      }

      return selection;
    }

    if (selection.kind === 'InlineFragment') {
      // A typed fragment (`... on Foo`) narrows the parent type.
      // An untyped fragment inherits the parent type.
      const branchType = selection.typeCondition
        ? schema.getType(selection.typeCondition.name.value)
        : parentType;

      if (!isCompositeType(branchType)) return selection;

      const newSelectionSet = walkSelectionSet(
        selection.selectionSet,
        branchType,
        isAbstractType(branchType),
        schema,
      );

      if (newSelectionSet !== selection.selectionSet) {
        selectionsChanged = true;
        return {
          ...selection,
          selectionSet: newSelectionSet,
        } satisfies InlineFragmentNode;
      }

      return selection;
    }

    // FRAGMENT_SPREAD — the definition is handled at the top-level definitions
    // pass; the spread node itself carries no selectionSet.
    return selection;
  });

  if (!needsTypename && !selectionsChanged) {
    return selectionSet;
  }

  return {
    ...selectionSet,
    selections: needsTypename ? [...augmentedSelections, TYPENAME_FIELD] : augmentedSelections,
  };
}

/**
 * Resolves the field definition for a given field node on a parent type,
 * including the meta-fields __schema, __type, and __typename.
 */
function getFieldDef(parentType: GraphQLCompositeType, field: FieldNode) {
  const name = field.name.value;
  // ignore internal fields like __schema, __type, and __typename
  if (name.startsWith('__')) {
    return null;
  }

  return 'getFields' in parentType ? (parentType.getFields()[name] ?? null) : null;
}
