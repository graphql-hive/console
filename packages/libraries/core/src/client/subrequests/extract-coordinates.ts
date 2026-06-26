import {
  DocumentNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLNamedType,
  GraphQLSchema,
  isAbstractType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';

export type CoordinateMap = Record<string, number>;
interface FieldPlan {
  fieldCoords: string[];
  childPlan: PlanNode | null;
  expectedTypeName: string;
}

interface TypePlan {
  typeCoords: string[];
  fields: Record<string, FieldPlan>;
  isEnum: boolean;
  enumName: string | null;
}

type PlanNode = Map<string, TypePlan>;

const docCache = new WeakMap<
  DocumentNode,
  { operation: OperationDefinitionNode | null; fragments: Record<string, FragmentDefinitionNode> }
>();

const schemaOperationPlanCache = new WeakMap<
  GraphQLSchema,
  WeakMap<OperationDefinitionNode, PlanNode>
>();

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

  let operationCache = schemaOperationPlanCache.get(schema);
  if (!operationCache) {
    operationCache = new WeakMap();
    schemaOperationPlanCache.set(schema, operationCache);
  }

  let rootPlan = operationCache.get(operation);
  if (!rootPlan) {
    rootPlan = buildPlanNode(schema, [operation.selectionSet], rootType, fragments);
    operationCache.set(operation, rootPlan);
  }

  traverseData(resultData, rootPlan, rootType.name, stats);

  return stats;
}

function buildPlanNode(
  schema: GraphQLSchema,
  selectionSets: SelectionSetNode[],
  parentType: GraphQLNamedType,
  fragments: Record<string, FragmentDefinitionNode>,
): PlanNode {
  const planNode: PlanNode = new Map();
  const namedType = getNamedType(parentType);

  let possibleTypes: readonly GraphQLNamedType[];
  if (isAbstractType(namedType)) {
    possibleTypes = schema.getPossibleTypes(namedType);
  } else {
    possibleTypes = [namedType];
  }

  for (const concreteType of possibleTypes) {
    const typePlan: TypePlan = {
      typeCoords: [concreteType.name],
      fields: {},
      isEnum: isEnumType(concreteType),
      enumName: isEnumType(concreteType) ? concreteType.name : null,
    };

    if (isObjectType(concreteType)) {
      for (const iface of concreteType.getInterfaces()) {
        if (iface.name !== namedType.name && iface.name !== concreteType.name) {
          typePlan.typeCoords.push(iface.name);
        }
      }
      if (namedType.name !== concreteType.name && !typePlan.typeCoords.includes(namedType.name)) {
        typePlan.typeCoords.push(namedType.name);
      }
    } else if (namedType.name !== concreteType.name) {
      typePlan.typeCoords.push(namedType.name);
    }

    typePlan.typeCoords = Array.from(new Set(typePlan.typeCoords));

    if (selectionSets.length > 0 && isObjectType(concreteType)) {
      const mergedFields = collectFieldsForType(selectionSets, concreteType, schema, fragments);

      for (const responseKey in mergedFields) {
        const { fieldName, selectionSets: fieldSelSets } = mergedFields[responseKey];
        const fieldDef = concreteType.getFields()[fieldName];

        if (!fieldDef) continue;

        const fieldCoords = [`${concreteType.name}.${fieldName}`];
        for (const iface of concreteType.getInterfaces()) {
          if (iface.getFields()[fieldName]) {
            fieldCoords.push(`${iface.name}.${fieldName}`);
          }
        }

        const fieldNamedType = getNamedType(fieldDef.type);
        const childPlan = buildPlanNode(schema, fieldSelSets, fieldNamedType, fragments);

        typePlan.fields[responseKey] = {
          fieldCoords,
          childPlan,
          expectedTypeName: fieldNamedType.name,
        };
      }
    }

    planNode.set(concreteType.name, typePlan);
  }

  return planNode;
}

function collectFieldsForType(
  selectionSets: SelectionSetNode[],
  concreteType: GraphQLNamedType,
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
): Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> {
  const fields: Record<string, { fieldName: string; selectionSets: SelectionSetNode[] }> = {};

  function visit(selectionSet: SelectionSetNode) {
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
        if (frag && doesTypeMatch(frag.typeCondition.name.value, concreteType, schema)) {
          visit(frag.selectionSet);
        }
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        const typeCondition = selection.typeCondition?.name.value;
        if (!typeCondition || doesTypeMatch(typeCondition, concreteType, schema)) {
          visit(selection.selectionSet);
        }
      }
    }
  }

  for (const selSet of selectionSets) {
    visit(selSet);
  }

  return fields;
}

function doesTypeMatch(
  typeCondition: string,
  concreteType: GraphQLNamedType,
  schema: GraphQLSchema,
): boolean {
  if (typeCondition === concreteType.name) return true;
  const conditionType = schema.getType(typeCondition);
  if (!conditionType) return false;

  if (isInterfaceType(conditionType) && isObjectType(concreteType)) {
    return concreteType.getInterfaces().some(i => i.name === typeCondition);
  }
  if (isAbstractType(conditionType)) {
    return schema.getPossibleTypes(conditionType).some(t => t.name === concreteType.name);
  }
  return false;
}

function traverseData(
  data: any,
  planNode: PlanNode | null,
  fallbackTypeName: string,
  stats: CoordinateMap,
): void {
  if (data === null || data === undefined || !planNode) return;

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      traverseData(data[i], planNode, fallbackTypeName, stats);
    }
    return;
  }

  const typeName = data.__typename || fallbackTypeName;
  const typePlan = planNode.get(typeName) || planNode.get(fallbackTypeName);

  if (!typePlan) {
    stats[fallbackTypeName] = (stats[fallbackTypeName] || 0) + 1;
    return;
  }

  for (let i = 0; i < typePlan.typeCoords.length; i++) {
    const coord = typePlan.typeCoords[i];
    stats[coord] = (stats[coord] || 0) + 1;
  }

  if (typePlan.isEnum && typeof data === 'string' && typePlan.enumName) {
    const enumCoord = `${typePlan.enumName}.${data}`;
    stats[enumCoord] = (stats[enumCoord] || 0) + 1;
    return;
  }

  if (typeof data !== 'object') return;

  for (const responseKey in data) {
    if (responseKey === '__typename') continue;

    const fieldPlan = typePlan.fields[responseKey];
    if (!fieldPlan) continue;

    for (let i = 0; i < fieldPlan.fieldCoords.length; i++) {
      const coord = fieldPlan.fieldCoords[i];
      stats[coord] = (stats[coord] || 0) + 1;
    }

    if (fieldPlan.childPlan) {
      traverseData(data[responseKey], fieldPlan.childPlan, fieldPlan.expectedTypeName, stats);
    }
  }
}
