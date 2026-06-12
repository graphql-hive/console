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
 * Consolidates static request-scoped variables to reduce
 * memory allocation overhead on deep stack frames.
 */
type TraversalContext = {
  counts: Map<string, number>;
  getType: (name: string) => GraphQLNamedType | undefined;
  doesTypeMatch: (runtime: string, condition: string) => boolean;
  fragments: Map<string, FragmentDefinitionNode>;
  fieldMetaCache: Map<string, { type: GraphQLType; leafTypeName?: string }>;
  contextValue?: any;
  infoValue?: GraphQLResolveInfo;
};

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
  // Using Maps internally for optimized high-frequency writes
  const counts = new Map<string, number>();
  const fragments = new Map<string, FragmentDefinitionNode>();

  let operation: OperationDefinitionNode | undefined;

  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    if (def.kind === 'OperationDefinition' && !operation) {
      operation = def;
    } else if (def.kind === 'FragmentDefinition') {
      fragments.set(def.name.value, def);
    }
  }

  // Convert empty Map to Record to maintain return signature
  if (!operation || !resultData) return {};

  let rootType: GraphQLObjectType | undefined | null;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType) return {};

  const typeCache = new Map<string, GraphQLNamedType>();
  const getType = (name: string): GraphQLNamedType | undefined => {
    let type = typeCache.get(name);
    if (!type) {
      const schemaType = schema.getType(name);
      if (schemaType) {
        typeCache.set(name, schemaType);
        type = schemaType;
      }
    }
    return type;
  };

  const matchCache = new Map<string, boolean>();
  const doesTypeMatch = (runtimeTypeName: string, typeConditionName: string): boolean => {
    if (runtimeTypeName === typeConditionName) return true;

    const cacheKey = runtimeTypeName + '|' + typeConditionName;
    const cached = matchCache.get(cacheKey);
    if (cached !== undefined) return cached;

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

    matchCache.set(cacheKey, isMatch);
    return isMatch;
  };

  const ctx: TraversalContext = {
    counts,
    getType,
    doesTypeMatch,
    fragments,
    fieldMetaCache: new Map(),
    contextValue,
    infoValue,
  };

  walkNode(resultData, operation.selectionSet.selections, rootType, ctx);

  // Convert internal Map to a plain object for the public API boundary
  const resultRecord: Record<string, number> = Object.create(null);
  for (const [key, value] of counts.entries()) {
    resultRecord[key] = value;
  }

  return resultRecord;
}

function walkNode(
  data: any,
  selections: readonly SelectionNode[],
  parentType: GraphQLType,
  ctx: TraversalContext,
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
        walkObject(item, selections, namedType, false, ctx);
      }
    }
    return;
  }

  walkObject(data, selections, namedType, false, ctx);
}

function walkObject(
  data: any,
  selections: readonly SelectionNode[],
  namedType: GraphQLNamedType,
  isFragmentRecurse: boolean,
  ctx: TraversalContext,
) {
  const namedTypeName = namedType.name;
  let runtimeTypeName = data.__typename;
  const isAbstractType = isInterfaceType(namedType) || isUnionType(namedType);

  // Use resolveType for abstract types if __typename is missing from the payload
  if (!runtimeTypeName && isAbstractType) {
    runtimeTypeName =
      (ctx.infoValue &&
        namedType.resolveType?.(data, ctx.contextValue, ctx.infoValue, namedType)) ??
      namedTypeName;
  }

  runtimeTypeName = runtimeTypeName || namedTypeName;

  /** Track the abstract type as having been used */
  if (runtimeTypeName !== namedTypeName && isAbstractType) {
    ctx.counts.set(namedTypeName, (ctx.counts.get(namedTypeName) || 0) + 1);
  }

  if (!isFragmentRecurse) {
    // This accurately registers the resolved implementation to the counts map
    ctx.counts.set(runtimeTypeName, (ctx.counts.get(runtimeTypeName) || 0) + 1);
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
        ctx.counts.set(coordinate, (ctx.counts.get(coordinate) || 0) + 1);

        if (val !== null) {
          // Attempt to pull the resolved schema definitions from our short-lived cache
          let meta = ctx.fieldMetaCache.get(coordinate);

          if (!meta) {
            if (!fields) {
              fields = 'getFields' in namedType ? namedType.getFields() : {};
            }
            const fieldDef = fields[realFieldName];
            if (fieldDef) {
              meta = {
                type: fieldDef.type,
                leafTypeName: selection.selectionSet
                  ? undefined
                  : getNamedType(fieldDef.type)?.name,
              };
              ctx.fieldMetaCache.set(coordinate, meta);
            }
          }

          if (meta) {
            if (selection.selectionSet) {
              walkNode(val, selection.selectionSet.selections, meta.type, ctx);
            } else if (meta.leafTypeName) {
              // Fast path for arrays of Leaf Types (Scalars / Enums)
              const leafType = meta.leafTypeName;
              if (Array.isArray(val)) {
                let leafCount = 0;
                for (let j = 0; j < val.length; j++) {
                  if (val[j] !== null) leafCount++;
                }
                if (leafCount > 0) {
                  ctx.counts.set(leafType, (ctx.counts.get(leafType) || 0) + leafCount);
                }
              } else {
                ctx.counts.set(leafType, (ctx.counts.get(leafType) || 0) + 1);
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
        matchesType = ctx.doesTypeMatch(runtimeTypeName, typeConditionName);
        if (matchesType) {
          nextType = ctx.getType(typeConditionName) || namedType;
        }
      }

      if (matchesType && selection.selectionSet) {
        walkObject(data, selection.selectionSet.selections, nextType, true, ctx);
      }
    } else if (selection.kind === 'FragmentSpread') {
      const fragmentName = selection.name.value;
      const fragmentDef = ctx.fragments.get(fragmentName);

      if (fragmentDef) {
        const typeConditionName = fragmentDef.typeCondition.name.value;
        let matchesType = true;
        let nextType: GraphQLNamedType = namedType;

        if (typeConditionName) {
          matchesType = ctx.doesTypeMatch(runtimeTypeName, typeConditionName);
          if (matchesType) {
            nextType = ctx.getType(typeConditionName) || namedType;
          }
        }

        if (matchesType && fragmentDef.selectionSet) {
          walkObject(data, fragmentDef.selectionSet.selections, nextType, true, ctx);
        }
      }
    }
  }
}
