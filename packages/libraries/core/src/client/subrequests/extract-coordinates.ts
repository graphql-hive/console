import {
  getNamedType,
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
 * Extracts true schema coordinates and counts their execution volume.
 */
export function extractCoordinates(
  schema: GraphQLSchema,
  document: DocumentNode,
  resultData: any,
): Record<string, number> {
  const counts: Record<string, number> = {};

  // 1. Find the root operation (Query, Mutation, Subscription)
  const operation = document.definitions.find(
    (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition',
  );
  if (!operation) return counts;

  // 2. Determine the root schema type
  let rootType;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType || !resultData) return counts;

  // 3. Start the synchronized walk
  walkZip(resultData, operation.selectionSet.selections, rootType, schema, counts);

  return counts;
}

function walkZip(
  data: any,
  selections: readonly SelectionNode[],
  parentType: GraphQLType,
  schema: GraphQLSchema,
  counts: Record<string, number>,
) {
  if (Array.isArray(data)) {
    for (const item of data) {
      walkZip(item, selections, parentType, schema, counts);
    }
    return;
  }

  if (data === null || typeof data !== 'object') {
    return;
  }

  const namedType = getNamedType(parentType);
  if (!isObjectType(namedType) && !isInterfaceType(namedType) && !isUnionType(namedType)) {
    return;
  }

  // Get fields, but safely handle Union types which don't have direct fields
  const fields = 'getFields' in namedType ? namedType.getFields() : {};

  for (const selection of selections) {
    if (selection.kind === 'Field') {
      const realFieldName = selection.name.value;
      const responseKey = selection.alias ? selection.alias.value : realFieldName;

      // Special case for __typename which isn't in the schema fields map
      if (realFieldName === '__typename') {
        continue;
      }

      if (responseKey in data) {
        const coordinate = `${namedType.name}.${realFieldName}`;
        counts[coordinate] = (counts[coordinate] || 0) + 1;

        if (selection.selectionSet && fields[realFieldName]) {
          walkZip(
            data[responseKey],
            selection.selectionSet.selections,
            fields[realFieldName].type,
            schema,
            counts,
          );
        }
      }
    } else if (selection.kind === 'InlineFragment') {
      const typeConditionName = selection.typeCondition?.name.value;

      let matchesType = true;
      let nextType: GraphQLType = namedType;

      if (typeConditionName) {
        // In federated execution, abstract types (Interfaces/Unions) generally
        // return __typename in the payload. We use that to verify the fragment match.
        const runtimeTypeName = data.__typename || namedType.name;
        matchesType = typeConditionName === runtimeTypeName;

        if (matchesType) {
          nextType = schema.getType(typeConditionName) || namedType;
        }
      }

      // If the runtime data matches the fragment's type condition,
      // recurse using the SAME data node, but the fragment's selection set.
      if (matchesType && selection.selectionSet) {
        walkZip(
          data, // <-- Pass the exact same data object
          selection.selectionSet.selections,
          nextType, // <-- Pass the narrowed type
          schema,
          counts,
        );
      }
    }
  }
}
