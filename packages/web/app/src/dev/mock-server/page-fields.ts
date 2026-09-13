import {
  getNamedType,
  getNullableType,
  isCompositeType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLCompositeType,
  type GraphQLSchema,
  type GraphQLType,
  type SelectionSetNode,
} from 'graphql';

export type PinnableKind =
  | 'boolean'
  | 'enum'
  | 'connection'
  | 'list'
  | 'object'
  | 'number'
  | 'string';

export type PinnableField = {
  /** "Type.field", the pin key. */
  key: string;
  kind: PinnableKind;
  nullable: boolean;
  enumValues?: string[];
  /**
   * True when the page only reaches this field through a list, so a pin applies to every
   * item (every SupportTicket, every SchemaCheck) rather than to one thing on the page.
   */
  perItem: boolean;
  /** Operations on the page that select this field. */
  operations: string[];
};

const SKIPPED_FIELDS = new Set(['id', 'cursor', '__typename']);
const NUMBER_SCALARS = new Set(['Int', 'Float', 'SafeInt']);

/**
 * The fields a page can branch on, from the documents it sends. Anything a pin can set to
 * something meaningful: booleans, enums, lists and connections (empty), nullable objects
 * (null), numbers and strings. Plain non-null objects are left out since there is nothing
 * useful to pin them to.
 *
 * Walks selection sets by hand rather than with `visit`, so fragment spreads are followed
 * where they are used and "is this inside a list" is known for every field.
 */
export function collectPinnableFields(
  schema: GraphQLSchema,
  documents: DocumentNode[],
): PinnableField[] {
  const found = new Map<string, PinnableField>();

  for (const document of documents) {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION)
        fragments.set(definition.name.value, definition);
    }

    for (const definition of document.definitions) {
      if (definition.kind !== Kind.OPERATION_DEFINITION) continue;
      const operationName = definition.name?.value ?? 'anonymous';
      const root = schema.getRootType(definition.operation);
      if (!root) continue;

      const walk = (
        selectionSet: SelectionSetNode,
        parent: GraphQLCompositeType,
        inList: boolean,
      ) => {
        for (const selection of selectionSet.selections) {
          if (selection.kind === Kind.FRAGMENT_SPREAD) {
            const fragment = fragments.get(selection.name.value);
            const type = fragment && schema.getType(fragment.typeCondition.name.value);
            if (fragment && (isObjectType(type) || isInterfaceType(type))) {
              walk(fragment.selectionSet, type, inList);
            }
            continue;
          }
          if (selection.kind === Kind.INLINE_FRAGMENT) {
            const named = selection.typeCondition?.name.value;
            const type = named ? schema.getType(named) : parent;
            if (isObjectType(type) || isInterfaceType(type))
              walk(selection.selectionSet, type, inList);
            continue;
          }

          // Unions have no fields of their own; their members arrive via inline fragments.
          if (!isObjectType(parent) && !isInterfaceType(parent)) continue;
          const field = parent.getFields()[selection.name.value];
          if (!field) continue;

          if (!SKIPPED_FIELDS.has(field.name)) {
            const kind = kindOf(field.type);
            const nullable = !isNonNullType(field.type);
            if (!(kind === 'object' && !nullable)) {
              const key = `${parent.name}.${field.name}`;
              const existing = found.get(key);
              if (existing) {
                existing.perItem &&= inList;
                if (!existing.operations.includes(operationName)) {
                  existing.operations.push(operationName);
                }
              } else {
                const named = getNamedType(field.type);
                found.set(key, {
                  key,
                  kind,
                  nullable,
                  ...(isEnumType(named) ? { enumValues: named.getValues().map(v => v.value) } : {}),
                  perItem: inList,
                  operations: [operationName],
                });
              }
            }
          }

          if (selection.selectionSet) {
            const child = getNamedType(field.type);
            if (isCompositeType(child)) {
              walk(
                selection.selectionSet,
                child,
                inList || isListType(getNullableType(field.type)),
              );
            }
          }
        }
      };

      walk(definition.selectionSet, root, false);
    }
  }

  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function kindOf(type: GraphQLType): PinnableKind {
  const nullable = getNullableType(type);
  if (isListType(nullable)) return 'list';
  const named = getNamedType(nullable);
  if (isEnumType(named)) return 'enum';
  if (isScalarType(named)) {
    if (named.name === 'Boolean') return 'boolean';
    if (NUMBER_SCALARS.has(named.name)) return 'number';
    return 'string';
  }
  if (isObjectType(named)) {
    const fields = named.getFields();
    return 'edges' in fields || 'nodes' in fields ? 'connection' : 'object';
  }
  return 'object';
}
