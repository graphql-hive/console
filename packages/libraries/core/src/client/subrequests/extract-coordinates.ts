import {
  DocumentNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';

export type CoordinateMap = Record<string, number>;

const docCache = new WeakMap<
  DocumentNode,
  { operation: OperationDefinitionNode | null; fragments: Record<string, FragmentDefinitionNode> }
>();

const planCache = new WeakMap<
  SelectionSetNode,
  Record<string, Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }>>
>();

// Schema-level caches — keyed by schema instance so they survive across calls
const schemaFieldCoordCache = new WeakMap<GraphQLSchema, Map<string, string[]>>();
const schemaTypeMatchCache = new WeakMap<GraphQLSchema, Map<string, boolean>>();
const schemaTypeLookupCache = new WeakMap<
  GraphQLSchema,
  Map<string, GraphQLNamedType | undefined>
>();

function getOrCreate<K extends object, V>(map: WeakMap<K, V>, key: K, factory: () => V): V {
  let v = map.get(key);
  if (!v) {
    v = factory();
    map.set(key, v);
  }
  return v;
}

export function extractCoordinates({
  schema,
  document,
  resultData,
}: {
  schema: GraphQLSchema;
  document: DocumentNode;
  resultData: any;
}): CoordinateMap {
  const stats: CoordinateMap = {};

  let docInfo = docCache.get(document);
  if (!docInfo) {
    let operation: OperationDefinitionNode | null = null;
    const fragments: Record<string, FragmentDefinitionNode> = {};

    for (const def of document.definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[def.name.value] = def;
      } else if (def.kind === Kind.OPERATION_DEFINITION) {
        if (!operation) operation = def;
      }
    }
    docInfo = { operation, fragments };
    docCache.set(document, docInfo);
  }

  const { operation, fragments } = docInfo;
  if (!operation || !resultData) return stats;

  const rootType =
    operation.operation === 'mutation'
      ? schema.getMutationType()
      : operation.operation === 'subscription'
        ? schema.getSubscriptionType()
        : schema.getQueryType();

  if (!rootType) return stats;

  const fieldCoordCache = getOrCreate(
    schemaFieldCoordCache,
    schema,
    () => new Map<string, string[]>(),
  );
  const typeMatchCache = getOrCreate(
    schemaTypeMatchCache,
    schema,
    () => new Map<string, boolean>(),
  );
  const typeLookupCache = getOrCreate(
    schemaTypeLookupCache,
    schema,
    () => new Map<string, GraphQLNamedType | undefined>(),
  );

  traverse(
    resultData,
    rootType,
    [operation.selectionSet],
    schema,
    fragments,
    stats,
    fieldCoordCache,
    typeMatchCache,
    typeLookupCache,
  );

  return stats;
}

function traverse(
  data: any,
  type: GraphQLType,
  selectionSets: SelectionSetNode[],
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  stats: CoordinateMap,
  fieldCoordCache: Map<string, string[]>,
  typeMatchCache: Map<string, boolean>,
  typeLookupCache: Map<string, GraphQLNamedType | undefined>,
): void {
  if (Array.isArray(data)) {
    for (const item of data) {
      traverse(
        item,
        type,
        selectionSets,
        schema,
        fragments,
        stats,
        fieldCoordCache,
        typeMatchCache,
        typeLookupCache,
      );
    }
    return;
  }

  if (data === null || data === undefined) return;

  const namedType = getNamedType(type);
  const concreteTypeName: string | undefined = data.__typename;

  let concreteType: GraphQLNamedType = namedType;

  if (concreteTypeName && concreteTypeName !== namedType.name) {
    let resolved = typeLookupCache.get(concreteTypeName);
    if (!resolved) {
      // Store the namedType fallback on miss so the cache is always populated with a
      // truthy value — avoids re-hitting schema.getType() for unknown __typename values.
      resolved = schema.getType(concreteTypeName) ?? namedType;
      typeLookupCache.set(concreteTypeName, resolved);
    }
    concreteType = resolved;
  }

  stats[namedType.name] = (stats[namedType.name] || 0) + 1;

  if (concreteType !== namedType) {
    stats[concreteType.name] = (stats[concreteType.name] || 0) + 1;
  }

  if (isObjectType(concreteType)) {
    for (const iface of concreteType.getInterfaces()) {
      // Only count the interface if we haven't already counted it above as namedType.
      // (e.g. Query { node: Node } — namedType=Node, concreteType=User implements Node)
      if (iface.name !== namedType.name) {
        stats[iface.name] = (stats[iface.name] || 0) + 1;
      }
    }
  }

  // Track exact enum value
  if (isEnumType(concreteType) && typeof data === 'string') {
    const enumCoord = `${concreteType.name}.${data}`;
    stats[enumCoord] = (stats[enumCoord] || 0) + 1;
  }

  if (typeof data !== 'object' || selectionSets.length === 0) return;

  const fields =
    selectionSets.length === 1
      ? getFieldsForType(selectionSets[0], concreteType, fragments, schema, typeMatchCache)
      : mergeSelectionSets(selectionSets, concreteType, fragments, schema, typeMatchCache);

  // Traverse response keys
  for (const responseKey of Object.keys(data)) {
    if (responseKey === '__typename') continue;

    const fieldInfo = fields[responseKey];
    if (!fieldInfo) continue;

    const { fieldName, selectionSets: fieldSelSets } = fieldInfo;
    let fieldDef: any = null;

    if (isObjectType(concreteType) || isInterfaceType(concreteType)) {
      fieldDef = concreteType.getFields()[fieldName];
    }

    if (fieldDef) {
      const cacheKey = `${concreteType.name}.${fieldName}`;
      let coordsToIncrement = fieldCoordCache.get(cacheKey);

      if (!coordsToIncrement) {
        coordsToIncrement = [`${concreteType.name}.${fieldName}`];
        if (isObjectType(concreteType)) {
          for (const iface of concreteType.getInterfaces()) {
            if (iface.getFields()[fieldName]) {
              coordsToIncrement.push(`${iface.name}.${fieldName}`);
            }
          }
        }
        fieldCoordCache.set(cacheKey, coordsToIncrement);
      }

      for (const coord of coordsToIncrement) {
        stats[coord] = (stats[coord] || 0) + 1;
      }

      traverse(
        data[responseKey],
        fieldDef.type,
        fieldSelSets,
        schema,
        fragments,
        stats,
        fieldCoordCache,
        typeMatchCache,
        typeLookupCache,
      );
    }
  }
}

function mergeSelectionSets(
  selectionSets: SelectionSetNode[],
  concreteType: GraphQLNamedType,
  fragments: Record<string, FragmentDefinitionNode>,
  schema: GraphQLSchema,
  typeMatchCache: Map<string, boolean>,
): Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> {
  const merged: Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> = {};

  for (const selSet of selectionSets) {
    const fields = getFieldsForType(selSet, concreteType, fragments, schema, typeMatchCache);
    for (const resKey in fields) {
      const info = fields[resKey];
      if (!merged[resKey]) {
        merged[resKey] = { fieldName: info.fieldName, selectionSets: [] };
      }
      // PERF: push.apply avoids the implicit arguments spread that `push(...array)` creates
      // when the inner array has many elements.
      Array.prototype.push.apply(merged[resKey].selectionSets, info.selectionSets);
    }
  }

  return merged;
}

function getFieldsForType(
  selectionSet: SelectionSetNode,
  concreteType: GraphQLNamedType,
  fragments: Record<string, FragmentDefinitionNode>,
  schema: GraphQLSchema,
  typeMatchCache: Map<string, boolean>,
): Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> {
  let typeMap = planCache.get(selectionSet);
  if (!typeMap) {
    typeMap = {};
    planCache.set(selectionSet, typeMap);
  }

  if (!typeMap[concreteType.name]) {
    typeMap[concreteType.name] = collectFields(
      selectionSet,
      concreteType,
      fragments,
      schema,
      typeMatchCache,
    );
  }

  return typeMap[concreteType.name];
}

function collectFields(
  selectionSet: SelectionSetNode,
  concreteType: GraphQLNamedType,
  fragments: Record<string, FragmentDefinitionNode>,
  schema: GraphQLSchema,
  typeMatchCache: Map<string, boolean>,
  fields: Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> = {},
): Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const responseKey = selection.alias ? selection.alias.value : selection.name.value;
      const fieldName = selection.name.value;

      if (fieldName === '__typename') continue;

      if (!fields[responseKey]) {
        fields[responseKey] = { fieldName, selectionSets: [] };
      }

      if (selection.selectionSet) {
        fields[responseKey].selectionSets.push(selection.selectionSet);
      }
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[selection.name.value];
      if (
        frag &&
        doesTypeMatch(frag.typeCondition.name.value, concreteType, schema, typeMatchCache)
      ) {
        collectFields(frag.selectionSet, concreteType, fragments, schema, typeMatchCache, fields);
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      const typeCondition = selection.typeCondition?.name.value;
      if (!typeCondition || doesTypeMatch(typeCondition, concreteType, schema, typeMatchCache)) {
        collectFields(
          selection.selectionSet,
          concreteType,
          fragments,
          schema,
          typeMatchCache,
          fields,
        );
      }
    }
  }
  return fields;
}

function doesTypeMatch(
  typeCondition: string,
  concreteType: GraphQLNamedType,
  schema: GraphQLSchema,
  typeMatchCache: Map<string, boolean>,
): boolean {
  if (typeCondition === concreteType.name) return true;

  const cacheKey = `${typeCondition}:${concreteType.name}`;
  const cached = typeMatchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let isMatch = false;
  const conditionType = schema.getType(typeCondition);

  if (conditionType) {
    if (isInterfaceType(conditionType) && isObjectType(concreteType)) {
      isMatch = concreteType.getInterfaces().some(i => i.name === typeCondition);
    } else if (isUnionType(conditionType)) {
      isMatch = conditionType.getTypes().some(t => t.name === concreteType.name);
    }
  }

  typeMatchCache.set(cacheKey, isMatch);
  return isMatch;
}
