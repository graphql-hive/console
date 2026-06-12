import {
  getNamedType,
  isAbstractType,
  isCompositeType,
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

  const augmentedDefinitions = document.definitions.map(def => {
    if (def.kind === Kind.OPERATION_DEFINITION) {
      const rootType =
        def.operation === 'query'
          ? queryType
          : def.operation === 'mutation'
            ? mutationType
            : subscriptionType;

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

    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      const onType = schema.getType(def.typeCondition.name.value);
      if (!onType || !isCompositeType(onType)) return def;

      const newSelectionSet = walkSelectionSet(
        def.selectionSet,
        onType,
        isAbstractType(onType),
        schema,
      );
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

  // Inject __typename when:
  //   1. This selection set is typed as an abstract type directly, OR
  //   2. This is a concrete inline-fragment branch inside an abstract parent
  //      (parentIsAbstract && isObjectType), so the concrete type is
  //      identifiable only with __typename at runtime.
  const needsTypename =
    (thisTypeIsAbstract || (parentIsAbstract && isObjectType(parentType))) &&
    !selectionSet.selections.some(s => s.kind === Kind.FIELD && s.name.value === '__typename');

  let selectionsChanged = false;

  const augmentedSelections = selectionSet.selections.map(selection => {
    if (selection.kind === Kind.FIELD) {
      if (!selection.selectionSet) {
        return selection; // Scalar or enum leaf.
      }

      const fieldDef = getFieldDef(schema, parentType, selection);
      if (!fieldDef) return selection;

      const fieldType = getNamedType(fieldDef.type);
      if (!fieldType || !isCompositeType(fieldType)) return selection;

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

    if (selection.kind === Kind.INLINE_FRAGMENT) {
      // A typed fragment (`... on Foo`) narrows the parent type.
      // An untyped fragment inherits the parent type.
      const branchType = selection.typeCondition
        ? schema.getType(selection.typeCondition.name.value)
        : parentType;

      if (!branchType || !isCompositeType(branchType)) return selection;

      const newSelectionSet = walkSelectionSet(
        selection.selectionSet,
        branchType,
        // Pass through whether the enclosing field was abstract, so that
        // concrete branches (... on User inside a Node field) still get
        // __typename injected into their own selection set.
        thisTypeIsAbstract || parentIsAbstract,
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
function getFieldDef(schema: GraphQLSchema, parentType: GraphQLCompositeType, field: FieldNode) {
  const name = field.name.value;

  if (name === '__schema' && parentType === schema.getQueryType()) {
    return SchemaMetaFieldDef;
  }
  if (name === '__type' && parentType === schema.getQueryType()) {
    return TypeMetaFieldDef;
  }
  if (name === '__typename') {
    return TypeNameMetaFieldDef;
  }

  return 'getFields' in parentType ? (parentType.getFields()[name] ?? null) : null;
}
