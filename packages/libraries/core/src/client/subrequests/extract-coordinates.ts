import {
  getNamedType,
  GraphQLNamedType,
  GraphQLObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type DocumentNode,
  type GraphQLSchema,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionNode,
} from 'graphql';

/**
 * Extracts true schema coordinates and counts their execution volume,
 * including resolved types.
 */
export function extractCoordinates(
  schema: GraphQLSchema,
  document: DocumentNode,
  resultData: any,
): Record<string, number> {
  // Optimization 1: Use a prototype-less object for faster dictionary I/O
  const counts: Record<string, number> = Object.create(null);

  const operation = document.definitions.find(
    (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition',
  );
  if (!operation) return counts;

  let rootType: GraphQLObjectType | undefined | null;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType || !resultData) return counts;

  // Optimization 2: Cache schema lookups to avoid Map lookups on repeated fragments
  const typeCache: Record<string, GraphQLNamedType> = Object.create(null);
  const getType = (name: string): GraphQLNamedType | undefined => {
    if (!typeCache[name]) {
      const type = schema.getType(name);
      if (type) typeCache[name] = type;
    }
    return typeCache[name];
  };

  // Start the synchronized walk
  walkNode(resultData, operation.selectionSet.selections, rootType, counts, getType);

  return counts;
}

/**
 * walkNode: Responsible for handling nulls, unwrapping types, and array iteration.
 */
function walkNode(
  data: any,
  selections: readonly SelectionNode[],
  parentType: GraphQLType,
  counts: Record<string, number>,
  getType: (name: string) => GraphQLNamedType | undefined,
) {
  if (data === null || typeof data !== 'object') return;

  // Optimization 3: Un-wrap the type ONCE before dealing with arrays
  const namedType = getNamedType(parentType);
  if (!isObjectType(namedType) && !isInterfaceType(namedType) && !isUnionType(namedType)) {
    return;
  }

  if (Array.isArray(data)) {
    // Optimization 4: Loop the array and send it directly to the object walker.
    // This bypasses `getNamedType` and array-checking for every single element.
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item !== null && typeof item === 'object') {
        walkObject(item, selections, namedType, counts, getType, false);
      }
    }
    return;
  }

  walkObject(data, selections, namedType, counts, getType, false);
}

/**
 * walkObject: Highly optimized hot-loop for standard objects and selections.
 */
function walkObject(
  data: any,
  selections: readonly SelectionNode[],
  namedType: GraphQLNamedType,
  counts: Record<string, number>,
  getType: (name: string) => GraphQLNamedType | undefined,
  isFragmentRecurse: boolean,
) {
  const namedTypeName = namedType.name;
  const runtimeTypeName = data.__typename || namedTypeName;

  if (!isFragmentRecurse) {
    counts[runtimeTypeName] = (counts[runtimeTypeName] || 0) + 1;
  }

  let fields: any = null;

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];

    if (selection.kind === 'Field') {
      const realFieldName = selection.name.value;
      if (realFieldName === '__typename') continue;

      const responseKey = selection.alias ? selection.alias.value : realFieldName;
      const val = data[responseKey];

      if (val !== undefined) {
        // Optimization 5: String concatenation over template literals
        const coordinate = namedTypeName + '.' + realFieldName;
        counts[coordinate] = (counts[coordinate] || 0) + 1;

        if (selection.selectionSet && val !== null) {
          if (!fields) {
            fields = 'getFields' in namedType ? (namedType as any).getFields() : {};
          }

          const fieldDef = fields[realFieldName];
          if (fieldDef) {
            // We drop back down to walkNode because `val` might be an array or null
            walkNode(val, selection.selectionSet.selections, fieldDef.type, counts, getType);
          }
        }
      }
    } else if (selection.kind === 'InlineFragment') {
      const typeConditionName = selection.typeCondition?.name.value;
      let matchesType = true;
      let nextType: GraphQLNamedType = namedType;

      if (typeConditionName) {
        matchesType = typeConditionName === runtimeTypeName;
        if (matchesType) {
          nextType = getType(typeConditionName) || namedType;
        }
      }

      if (matchesType && selection.selectionSet) {
        // Optimization 6: Because fragments resolve on the SAME object,
        // we skip walkNode entirely and recurse directly into walkObject.
        walkObject(data, selection.selectionSet.selections, nextType, counts, getType, true);
      }
    }
  }
}
