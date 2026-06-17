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

type TraversalContext = {
  schema: GraphQLSchema;
  counts: Record<string, number>;
  doesTypeMatch: (runtime: string, condition: string) => boolean;
  fragments: Map<string, FragmentDefinitionNode>;
  fieldMetaCache: Map<string, { type: GraphQLType; leafTypeName?: string }>;
  contextValue?: any;
  infoValue?: GraphQLResolveInfo;
};

/** Runtime evaluation */
export function extractCoordinates({
  schema,
  document,
  resultData,
  contextValue,
  infoValue,
}: {
  schema: GraphQLSchema;
  document: DocumentNode;
  resultData: any;
  contextValue?: any;
  infoValue?: GraphQLResolveInfo;
}): Record<string, number> {
  // Early exit with consistent hidden class
  if (!resultData) return Object.create(null);

  let operation: OperationDefinitionNode | undefined;
  const fragments = new Map<string, FragmentDefinitionNode>();

  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    if (def.kind === 'OperationDefinition' && !operation) {
      operation = def;
    } else if (def.kind === 'FragmentDefinition') {
      fragments.set(def.name.value, def);
    }
  }

  if (!operation) return Object.create(null);

  let rootType: GraphQLObjectType | undefined | null;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType) return Object.create(null);

  const matchCache = new Map<string, Map<string, boolean>>();

  const doesTypeMatch = (runtimeTypeName: string, typeConditionName: string): boolean => {
    if (runtimeTypeName === typeConditionName) return true;

    let conditionMap = matchCache.get(runtimeTypeName);
    if (!conditionMap) {
      conditionMap = new Map();
      matchCache.set(runtimeTypeName, conditionMap);
    }

    const cached = conditionMap.get(typeConditionName);
    if (cached !== undefined) return cached;

    const runtimeType = schema.getType(runtimeTypeName);
    const conditionType = schema.getType(typeConditionName);

    let isMatch = false;
    if (runtimeType && conditionType) {
      if (isInterfaceType(conditionType) && isObjectType(runtimeType)) {
        isMatch = runtimeType.getInterfaces().some(i => i.name === conditionType.name);
      } else if (isUnionType(conditionType) && isObjectType(runtimeType)) {
        isMatch = conditionType.getTypes().some(t => t.name === runtimeType.name);
      }
    }

    conditionMap.set(typeConditionName, isMatch);
    return isMatch;
  };

  const counts: Record<string, number> = {};

  const ctx: TraversalContext = {
    schema,
    counts,
    doesTypeMatch,
    fragments,
    fieldMetaCache: new Map(),
    contextValue,
    infoValue,
  };

  walkNode(resultData, operation.selectionSet.selections, rootType, ctx);

  return counts;
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

  if (!runtimeTypeName && isAbstractType) {
    runtimeTypeName =
      (ctx.infoValue &&
        namedType.resolveType?.(data, ctx.contextValue, ctx.infoValue, namedType)) ??
      namedTypeName;
  }

  runtimeTypeName = runtimeTypeName || namedTypeName;

  if (runtimeTypeName !== namedTypeName && isAbstractType) {
    const current = ctx.counts[namedTypeName];
    ctx.counts[namedTypeName] = current === undefined ? 1 : current + 1;
  }

  if (!isFragmentRecurse) {
    const current = ctx.counts[runtimeTypeName];
    ctx.counts[runtimeTypeName] = current === undefined ? 1 : current + 1;
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
        const currentCoordCount = ctx.counts[coordinate];
        ctx.counts[coordinate] = currentCoordCount === undefined ? 1 : currentCoordCount + 1;

        if (val !== null) {
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
              const leafType = meta.leafTypeName;
              if (Array.isArray(val)) {
                let leafCount = 0;
                for (let j = 0; j < val.length; j++) {
                  if (val[j] !== null) leafCount++;
                }
                if (leafCount > 0) {
                  const currentLeafCount = ctx.counts[leafType];
                  ctx.counts[leafType] =
                    currentLeafCount === undefined ? leafCount : currentLeafCount + leafCount;
                }
              } else {
                const currentLeafCount = ctx.counts[leafType];
                ctx.counts[leafType] = currentLeafCount === undefined ? 1 : currentLeafCount + 1;
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
          nextType = ctx.schema.getType(typeConditionName) || namedType;
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
            nextType = ctx.schema.getType(typeConditionName) || namedType;
          }
        }

        if (matchesType && fragmentDef.selectionSet) {
          walkObject(data, fragmentDef.selectionSet.selections, nextType, true, ctx);
        }
      }
    }
  }
}

interface CompiledField {
  coordinate: string;
  childTypeName?: string;
  leafTypeName?: string;
}

type TypePlan = Map<string, CompiledField>;

type ExecutionPlan = Map<string, TypePlan>;

const documentPlanCache = new WeakMap<DocumentNode, ExecutionPlan>();
const hashPlanCache = new Map<string, ExecutionPlan>();

export interface ExtractCoordinatesArgs {
  schema: GraphQLSchema;
  document: DocumentNode;
  resultData: any;
  queryHash?: string;
}

export function extractCoordinatesFast({
  schema,
  document,
  resultData,
  queryHash,
}: ExtractCoordinatesArgs): Record<string, number> {
  if (!resultData) return Object.create(null);

  let plan: ExecutionPlan | undefined;
  if (queryHash) plan = hashPlanCache.get(queryHash);
  else plan = documentPlanCache.get(document);

  if (!plan) {
    plan = buildPlanFromDocument(schema, document);
    if (queryHash) hashPlanCache.set(queryHash, plan);
    else documentPlanCache.set(document, plan);
  }

  const counts: Record<string, number> = {};

  let rootTypeName = 'Query';
  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    if (def.kind === 'OperationDefinition') {
      if (def.operation === 'mutation') rootTypeName = schema.getMutationType()?.name || 'Mutation';
      else if (def.operation === 'subscription')
        rootTypeName = schema.getSubscriptionType()?.name || 'Subscription';
      else rootTypeName = schema.getQueryType()?.name || 'Query';
      break;
    }
  }

  const targetData = resultData.data !== undefined ? resultData.data : resultData;
  trackCompiledData(targetData, rootTypeName, plan, counts);

  return counts;
}

function trackCompiledData(
  data: any,
  expectedTypeName: string,
  plan: ExecutionPlan,
  counts: Record<string, number>,
) {
  if (data === null || typeof data !== 'object') return;

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      trackCompiledData(data[i], expectedTypeName, plan, counts);
    }
    return;
  }

  const actualTypeName = data.__typename || expectedTypeName;

  increment(counts, actualTypeName, 1);

  if (actualTypeName !== expectedTypeName) {
    increment(counts, expectedTypeName, 1);
  }

  executeTypePlan(data, expectedTypeName, plan, counts);

  if (actualTypeName !== expectedTypeName) {
    executeTypePlan(data, actualTypeName, plan, counts);
  }
}

function executeTypePlan(
  data: any,
  typeName: string,
  plan: ExecutionPlan,
  counts: Record<string, number>,
) {
  const typePlan = plan.get(typeName);
  if (!typePlan) return;

  for (const [responseKey, instruction] of typePlan.entries()) {
    const val = data[responseKey];

    if (val !== undefined) {
      increment(counts, instruction.coordinate, 1);

      if (val !== null) {
        if (instruction.childTypeName) {
          trackCompiledData(val, instruction.childTypeName, plan, counts);
        } else if (instruction.leafTypeName) {
          trackLeaf(val, instruction.leafTypeName, counts);
        }
      }
    }
  }
}

function buildPlanFromDocument(schema: GraphQLSchema, document: DocumentNode): ExecutionPlan {
  let operation: OperationDefinitionNode | undefined;
  const fragments = new Map<string, FragmentDefinitionNode>();

  for (let i = 0; i < document.definitions.length; i++) {
    const def = document.definitions[i];
    if (def.kind === 'OperationDefinition' && !operation) {
      operation = def;
    } else if (def.kind === 'FragmentDefinition') {
      fragments.set(def.name.value, def);
    }
  }

  const plan: ExecutionPlan = new Map();
  if (!operation) return plan;

  let rootType: GraphQLType | undefined | null;
  if (operation.operation === 'query') rootType = schema.getQueryType();
  else if (operation.operation === 'mutation') rootType = schema.getMutationType();
  else if (operation.operation === 'subscription') rootType = schema.getSubscriptionType();

  if (!rootType) return plan;

  compileExecutionPlan(schema, operation.selectionSet.selections, rootType, fragments, plan);
  return plan;
}

function compileExecutionPlan(
  schema: GraphQLSchema,
  selections: readonly SelectionNode[],
  parentType: GraphQLType,
  fragments: Map<string, FragmentDefinitionNode>,
  plan: ExecutionPlan,
) {
  const namedType = getNamedType(parentType);
  const typeName = namedType.name;

  let typePlan = plan.get(typeName);
  if (!typePlan) {
    typePlan = new Map();
    plan.set(typeName, typePlan);
  }

  let fieldsMap: GraphQLFieldMap<any, any> | undefined;
  if (isObjectType(namedType) || isInterfaceType(namedType)) {
    fieldsMap = namedType.getFields();
  }

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];

    if (selection.kind === 'Field') {
      const realFieldName = selection.name.value;
      if (realFieldName === '__typename') continue;

      const responseKey = selection.alias ? selection.alias.value : realFieldName;

      if (fieldsMap) {
        const fieldDef = fieldsMap[realFieldName];
        if (fieldDef) {
          const fieldType = getNamedType(fieldDef.type);
          const isLeaf =
            !isObjectType(fieldType) && !isInterfaceType(fieldType) && !isUnionType(fieldType);

          if (!typePlan.has(responseKey)) {
            typePlan.set(responseKey, {
              coordinate: typeName + '.' + realFieldName,
              childTypeName: !isLeaf ? fieldType.name : undefined,
              leafTypeName: isLeaf ? fieldType.name : undefined,
            });
          }

          if (selection.selectionSet && !isLeaf) {
            compileExecutionPlan(
              schema,
              selection.selectionSet.selections,
              fieldType,
              fragments,
              plan,
            );
          }
        }
      }
    } else if (selection.kind === 'InlineFragment') {
      const typeCondName = selection.typeCondition?.name.value;
      const nextType = typeCondName ? schema.getType(typeCondName) || namedType : namedType;
      compileExecutionPlan(schema, selection.selectionSet.selections, nextType, fragments, plan);
    } else if (selection.kind === 'FragmentSpread') {
      const frag = fragments.get(selection.name.value);
      if (frag) {
        const typeCondName = frag.typeCondition.name.value;
        const nextType = schema.getType(typeCondName) || namedType;
        compileExecutionPlan(schema, frag.selectionSet.selections, nextType, fragments, plan);
      }
    }
  }
}

function increment(counts: Record<string, number>, key: string, amount: number) {
  const current = counts[key];
  counts[key] = current === undefined ? amount : current + amount;
}

function trackLeaf(val: any, leafTypeName: string, counts: Record<string, number>) {
  if (Array.isArray(val)) {
    let leafCount = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== null && val[i] !== undefined) leafCount++;
    }
    if (leafCount > 0) increment(counts, leafTypeName, leafCount);
  } else {
    increment(counts, leafTypeName, 1);
  }
}
