import {
  getNamedType,
  GraphQLFieldMap,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionNode,
} from 'graphql';
import MemoryCache from '../../circuit-breaker/cache.js';

interface CompiledField {
  fieldName: string;
  childTypeName?: string;
  leafTypeName?: string;
}

type TypePlan = Map<string, CompiledField>;

type ExecutionPlan = Map<string, TypePlan>;

const RETENTION_CACHE_TTL_IN_SECONDS = 120;

const documentPlanCache = new WeakMap<DocumentNode, ExecutionPlan>();
const hashPlanCache = new MemoryCache({
  max: 1_000,
  ttl: RETENTION_CACHE_TTL_IN_SECONDS * 1000,
}) as unknown as Map<string, ExecutionPlan>;

const schemaCoordinateExpansionCache = new WeakMap<GraphQLSchema, Map<string, string[]>>();

export interface ExtractCoordinatesArgs {
  schema: GraphQLSchema;
  document: DocumentNode;
  resultData: any;
  queryHash?: string;
}

export function extractCoordinates({
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
  trackCompiledData(schema, targetData, rootTypeName, plan, counts);

  return counts;
}

function trackCompiledData(
  schema: GraphQLSchema,
  data: any,
  expectedTypeName: string,
  plan: ExecutionPlan,
  counts: Record<string, number>,
) {
  if (data === null || typeof data !== 'object') return;

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      trackCompiledData(schema, data[i], expectedTypeName, plan, counts);
    }
    return;
  }

  const actualTypeName = data.__typename ?? expectedTypeName;

  executeTypePlan(schema, data, actualTypeName, expectedTypeName, plan, counts);
}

function executeTypePlan(
  schema: GraphQLSchema,
  data: any,
  typeName: string,
  expectedTypeName: string,
  plan: ExecutionPlan,
  counts: Record<string, number>,
) {
  const actualType = schema.getType(typeName);

  if (actualType) {
    increment(counts, actualType.name, 1);

    if (isObjectType(actualType) || isInterfaceType(actualType)) {
      const interfaces = actualType.getInterfaces();
      for (let i = 0; i < interfaces.length; i++) {
        increment(counts, interfaces[i].name, 1);
      }
    }
  }

  if (expectedTypeName !== typeName) {
    const expectedType = schema.getType(expectedTypeName);
    if (expectedType && isUnionType(expectedType)) {
      increment(counts, expectedType.name, 1);
    }
  }

  const applicablePlans = new Set<TypePlan>();

  const typePlan = plan.get(typeName);
  if (typePlan) applicablePlans.add(typePlan);

  const expectedPlan = plan.get(expectedTypeName);
  if (expectedPlan) applicablePlans.add(expectedPlan);

  if (actualType && (isObjectType(actualType) || isInterfaceType(actualType))) {
    const interfaces = actualType.getInterfaces();
    for (let i = 0; i < interfaces.length; i++) {
      const ifacePlan = plan.get(interfaces[i].name);
      if (ifacePlan) applicablePlans.add(ifacePlan);
    }
  }

  if (applicablePlans.size === 0) return;

  const processedKeys = new Set<string>();

  for (const currentPlan of applicablePlans) {
    for (const [responseKey, instruction] of currentPlan.entries()) {
      if (processedKeys.has(responseKey)) continue;
      processedKeys.add(responseKey);

      const val = data[responseKey];

      if (val !== undefined) {
        if (actualType) {
          const fieldName = instruction.fieldName;
          let cache = schemaCoordinateExpansionCache.get(schema);
          if (!cache) {
            cache = new Map();
            schemaCoordinateExpansionCache.set(schema, cache);
          }

          const cacheKey = actualType.name + '.' + fieldName;
          let expanded = cache.get(cacheKey);

          if (!expanded) {
            expanded = [cacheKey];

            if (isObjectType(actualType) || isInterfaceType(actualType)) {
              const interfaces = actualType.getInterfaces();
              for (let i = 0; i < interfaces.length; i++) {
                const iface = interfaces[i];
                if (iface.getFields()[fieldName]) {
                  expanded.push(iface.name + '.' + fieldName);
                }
              }
            }

            cache.set(cacheKey, expanded);
          }

          const expandedCoords = expanded;
          for (let i = 0; i < expandedCoords.length; i++) {
            increment(counts, expandedCoords[i], 1);
          }
        }

        if (val !== null) {
          if (instruction.childTypeName) {
            trackCompiledData(schema, val, instruction.childTypeName, plan, counts);
          } else if (instruction.leafTypeName) {
            trackLeaf(val, instruction.leafTypeName, counts);
          }
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
              fieldName: realFieldName,
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
