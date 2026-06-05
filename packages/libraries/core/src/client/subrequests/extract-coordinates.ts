import {
  getNamedType,
  GraphQLFieldMap,
  GraphQLInputFieldMap,
  GraphQLResolveInfo,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionNode,
} from 'graphql';

/**
 * Extracts true schema coordinates and counts their execution volume,
 * including resolved types, aliases, unions, interfaces, and scalars.
 */
export function extractCoordinates(
  schema: GraphQLSchema,
  document: DocumentNode,
  resultData: any,
  /** Used to resolve an abstract type's real definition */
  contextValue?: any,
  infoValue?: GraphQLResolveInfo,
): Record<string, number> {
  const counts: Record<string, number> = Object.create(null);

  let operation: OperationDefinitionNode | undefined;
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);

  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    if (def.kind === 'OperationDefinition' && !operation) {
      operation = def;
    } else if (def.kind === 'FragmentDefinition') {
      fragments[def.name.value] = def;
    }
  }

  if (!operation || !resultData) return counts;

  let rootType: GraphQLObjectType | undefined | null;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType) return counts;

  const typeCache: Record<string, GraphQLNamedType> = Object.create(null);
  const getType = (name: string): GraphQLNamedType | undefined => {
    if (!typeCache[name]) {
      const type = schema.getType(name);
      if (type) typeCache[name] = type;
    }
    return typeCache[name];
  };

  const matchCache: Record<string, boolean> = Object.create(null);
  const doesTypeMatch = (runtimeTypeName: string, typeConditionName: string): boolean => {
    if (runtimeTypeName === typeConditionName) return true;

    const cacheKey = runtimeTypeName + '|' + typeConditionName;
    if (matchCache[cacheKey] !== undefined) return matchCache[cacheKey];

    const runtimeType = getType(runtimeTypeName);
    const conditionType = getType(typeConditionName);

    let isMatch = false;
    if (runtimeType && conditionType) {
      if (isInterfaceType(conditionType) && isObjectType(runtimeType)) {
        isMatch = runtimeType.getInterfaces().some(i => i.name === conditionType.name);
      } else if (isUnionType(conditionType) && isObjectType(runtimeType)) {
        isMatch = conditionType.getTypes().some(t => t.name === runtimeType.name);
      }
    }

    matchCache[cacheKey] = isMatch;
    return isMatch;
  };

  walkNode(
    resultData,
    operation.selectionSet.selections,
    rootType,
    counts,
    getType,
    doesTypeMatch,
    fragments,
    contextValue,
    infoValue,
  );

  return counts;
}

function walkNode(
  data: any,
  selections: readonly SelectionNode[],
  parentType: GraphQLType,
  counts: Record<string, number>,
  getType: (name: string) => GraphQLNamedType | undefined,
  doesTypeMatch: (runtime: string, condition: string) => boolean,
  fragments: Record<string, FragmentDefinitionNode>,
  contextValue?: any,
  infoValue?: GraphQLResolveInfo,
) {
  if (data === null || typeof data !== 'object') return;

  const namedType = getNamedType(parentType);
  if (!isObjectType(namedType) && !isInterfaceType(namedType) && !isUnionType(namedType)) {
    return;
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item !== null && typeof item === 'object') {
        walkObject(
          item,
          selections,
          namedType,
          counts,
          getType,
          doesTypeMatch,
          fragments,
          false,
          contextValue,
          infoValue,
        );
      }
    }
    return;
  }

  walkObject(
    data,
    selections,
    namedType,
    counts,
    getType,
    doesTypeMatch,
    fragments,
    false,
    contextValue,
    infoValue,
  );
}

function walkObject(
  data: any,
  selections: readonly SelectionNode[],
  namedType: GraphQLNamedType,
  counts: Record<string, number>,
  getType: (name: string) => GraphQLNamedType | undefined,
  doesTypeMatch: (runtime: string, condition: string) => boolean,
  fragments: Record<string, FragmentDefinitionNode>,
  isFragmentRecurse: boolean,
  contextValue?: any,
  infoValue?: GraphQLResolveInfo,
) {
  const namedTypeName = namedType.name;
  let runtimeTypeName = data.__typename;
  const isAbstractType = isInterfaceType(namedType) || isUnionType(namedType);

  // Use resolveType for abstract types if __typename is missing from the payload
  if (!runtimeTypeName && isAbstractType) {
    /**
     * Note that this should be a fallback for an extreme edge case. Because it's very unreliable.
     * Abstract types cannot be determined in the gateway to be of a specific other type because the resolveType function
     * won't have been implemented. However, this may solve the case in a monorepo.
     */
    runtimeTypeName =
      (infoValue && namedType.resolveType?.(data, contextValue, infoValue, namedType)) ??
      namedTypeName;
  }

  runtimeTypeName = runtimeTypeName || namedTypeName;

  /** Track the abstract type as having been used */
  if (runtimeTypeName !== namedTypeName && isAbstractType) {
    counts[namedTypeName] = (counts[namedTypeName] || 0) + 1;
  }

  if (!isFragmentRecurse) {
    // This accurately registers the resolved implementation to the counts map
    counts[runtimeTypeName] = (counts[runtimeTypeName] || 0) + 1;
  }

  let fields: GraphQLFieldMap<any, any> | GraphQLInputFieldMap | null = null;

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];

    if (selection.kind === 'Field') {
      const realFieldName = selection.name.value;
      if (realFieldName === '__typename') continue;

      const responseKey = selection.alias ? selection.alias.value : realFieldName;
      const val = data[responseKey];

      if (val !== undefined) {
        const coordinate = namedTypeName + '.' + realFieldName;
        counts[coordinate] = (counts[coordinate] || 0) + 1;

        if (val !== null) {
          if (!fields) {
            fields = 'getFields' in namedType ? namedType.getFields() : {};
          }

          const fieldDef = fields[realFieldName];
          if (fieldDef) {
            if (selection.selectionSet) {
              walkNode(
                val,
                selection.selectionSet.selections,
                fieldDef.type,
                counts,
                getType,
                doesTypeMatch,
                fragments,
                contextValue,
                infoValue,
              );
            } else {
              // Feature: Extract and count Leaf Types (Scalars / Enums)
              const leafTypeName = getNamedType(fieldDef.type)?.name;

              if (Array.isArray(val)) {
                let leafCount = 0;
                for (let j = 0; j < val.length; j++) {
                  if (val[j] !== null) leafCount++;
                }
                if (leafCount > 0) {
                  counts[leafTypeName] = (counts[leafTypeName] || 0) + leafCount;
                }
              } else {
                counts[leafTypeName] = (counts[leafTypeName] || 0) + 1;
              }
            }
          }
        }
      }
    } else if (selection.kind === 'InlineFragment') {
      const typeConditionName = selection.typeCondition?.name.value;
      let matchesType = true;
      let nextType: GraphQLNamedType = namedType;

      if (typeConditionName) {
        matchesType = doesTypeMatch(runtimeTypeName, typeConditionName);
        if (matchesType) {
          nextType = getType(typeConditionName) || namedType;
        }
      }

      if (matchesType && selection.selectionSet) {
        walkObject(
          data,
          selection.selectionSet.selections,
          nextType,
          counts,
          getType,
          doesTypeMatch,
          fragments,
          true,
          contextValue,
          infoValue,
        );
      }
    } else if (selection.kind === 'FragmentSpread') {
      const fragmentName = selection.name.value;
      const fragmentDef = fragments[fragmentName];

      if (fragmentDef) {
        const typeConditionName = fragmentDef.typeCondition.name.value;
        let matchesType = true;
        let nextType: GraphQLNamedType = namedType;

        if (typeConditionName) {
          matchesType = doesTypeMatch(runtimeTypeName, typeConditionName);
          if (matchesType) {
            nextType = getType(typeConditionName) || namedType;
          }
        }

        if (matchesType && fragmentDef.selectionSet) {
          walkObject(
            data,
            fragmentDef.selectionSet.selections,
            nextType,
            counts,
            getType,
            doesTypeMatch,
            fragments,
            true,
            contextValue,
            infoValue,
          );
        }
      }
    }
  }
}
