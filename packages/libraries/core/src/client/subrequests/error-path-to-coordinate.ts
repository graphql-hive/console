import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  OperationDefinitionNode,
  SelectionNode,
  type GraphQLSchema,
} from 'graphql';

interface SelectionLookupResult {
  fieldNode: FieldNode;
  typeName: string | null;
}

function findFieldAndTypeInSelections(
  selections: readonly SelectionNode[],
  responseName: string,
  fragments: Record<string, FragmentDefinitionNode>,
  currentTypeName: string | null = null,
): SelectionLookupResult | undefined {
  for (const selection of selections) {
    switch (selection.kind) {
      case 'Field': {
        const nameOrAlias = selection.alias?.value ?? selection.name.value;
        if (nameOrAlias === responseName) {
          return { fieldNode: selection, typeName: currentTypeName };
        }
        break;
      }
      case 'InlineFragment': {
        const typeConditionName = selection.typeCondition?.name.value ?? currentTypeName;
        const found = findFieldAndTypeInSelections(
          selection.selectionSet.selections,
          responseName,
          fragments,
          typeConditionName,
        );
        if (found) return found;
        break;
      }
      case 'FragmentSpread': {
        const fragment = fragments[selection.name.value];
        if (fragment) {
          const typeConditionName = fragment.typeCondition.name.value;
          const found = findFieldAndTypeInSelections(
            fragment.selectionSet.selections,
            responseName,
            fragments,
            typeConditionName,
          );
          if (found) return found;
        }
        break;
      }
    }
  }
  return undefined;
}

export function errorPathToCoordinate(
  schema: GraphQLSchema,
  errorPath: readonly (string | number)[],
  document: DocumentNode,
  data: any,
): string | undefined {
  let operation: OperationDefinitionNode | undefined;
  const fragments: Record<string, FragmentDefinitionNode> = {};

  for (const def of document.definitions) {
    if (def.kind === 'OperationDefinition' && !operation) {
      operation = def;
    } else if (def.kind === 'FragmentDefinition') {
      fragments[def.name.value] = def;
    }
  }

  const operationType = operation?.operation ?? 'query';
  const rootTypeMap = {
    query: schema.getQueryType(),
    mutation: schema.getMutationType(),
    subscription: schema.getSubscriptionType(),
  };

  let currentType: GraphQLType | undefined | null = rootTypeMap[operationType];
  let coordinate: string | null = null;
  let currentSelections = operation?.selectionSet.selections;
  let currentData = data;

  for (const segment of errorPath) {
    if (typeof segment === 'number') {
      currentData = currentData?.[segment];
      continue;
    }

    let nextType: GraphQLNamedType | undefined = getNamedType(currentType);

    if (currentData && typeof currentData === 'object' && !Array.isArray(currentData)) {
      const typeName = currentData.__typename;
      if (typeof typeName === 'string') {
        const runtimeType = schema.getType(typeName);
        if (runtimeType && (isObjectType(runtimeType) || isInterfaceType(runtimeType))) {
          nextType = runtimeType;
        }
      }
    }

    currentType = nextType;

    let astMatch: SelectionLookupResult | undefined;
    if (currentSelections) {
      astMatch = findFieldAndTypeInSelections(currentSelections, segment, fragments);
    }

    if (isAbstractType(currentType) && astMatch?.typeName) {
      const concreteType = schema.getType(astMatch.typeName);
      if (
        concreteType &&
        isObjectType(concreteType) &&
        schema.getPossibleTypes(currentType).some(t => t === concreteType)
      ) {
        currentType = concreteType;
      }
    }

    if (isObjectType(currentType) || isInterfaceType(currentType)) {
      // Map alias back to original schema field name using our cached astMatch
      const fieldName = astMatch ? astMatch.fieldNode.name.value : segment;
      const field: GraphQLField<any, any> | undefined = currentType.getFields()[fieldName];

      if (!field) {
        console.warn(
          `Hive Usage Client: Field '${fieldName}' (segment '${segment}') not found on type '${currentType.name}'. Error ignored.`,
        );
        return;
      }

      coordinate = `${currentType.name}.${field.name}`;
      currentType = field.type;
      currentSelections = astMatch?.fieldNode.selectionSet?.selections;
      currentData = currentData?.[segment];
    }
  }

  return coordinate ?? undefined;
}
