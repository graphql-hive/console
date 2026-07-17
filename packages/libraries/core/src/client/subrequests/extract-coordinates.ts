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

interface AstMatch {
  field: FieldNode;
  typeCondition?: string;
}

function getFieldFromSelections(
  selections: readonly SelectionNode[],
  responseName: string,
  fragments: Record<string, FragmentDefinitionNode>,
  parentType?: string,
): AstMatch | undefined {
  for (const sel of selections) {
    if (sel.kind === 'Field') {
      if ((sel.alias?.value ?? sel.name.value) === responseName) {
        return { field: sel, typeCondition: parentType };
      }
    } else if (sel.kind === 'InlineFragment') {
      const typeCondition = sel.typeCondition?.name.value ?? parentType;
      const res = getFieldFromSelections(
        sel.selectionSet.selections,
        responseName,
        fragments,
        typeCondition,
      );
      if (res) return res;
    } else if (sel.kind === 'FragmentSpread') {
      const frag = fragments[sel.name.value];
      if (frag) {
        const res = getFieldFromSelections(
          frag.selectionSet.selections,
          responseName,
          fragments,
          frag.typeCondition.name.value,
        );
        if (res) return res;
      }
    }
  }
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
    if (def.kind === 'OperationDefinition' && !operation) operation = def;
    if (def.kind === 'FragmentDefinition') fragments[def.name.value] = def;
  }

  let currentType: GraphQLType | undefined | null =
    operation?.operation === 'mutation'
      ? schema.getMutationType()
      : operation?.operation === 'subscription'
        ? schema.getSubscriptionType()
        : schema.getQueryType();

  let coordinate: string | undefined;
  let selections = operation?.selectionSet.selections;
  let currentData = data;

  for (const segment of errorPath) {
    if (typeof segment === 'number') {
      currentData = currentData?.[segment];
      continue;
    }

    let nextType: GraphQLNamedType | undefined = getNamedType(currentType);

    if (currentData?.__typename && typeof currentData.__typename === 'string') {
      const runtimeType = schema.getType(currentData.__typename);
      if (runtimeType && (isObjectType(runtimeType) || isInterfaceType(runtimeType))) {
        nextType = runtimeType;
      }
    }

    currentType = nextType;

    let astMatch: AstMatch | undefined;
    if (selections) {
      astMatch = getFieldFromSelections(selections, segment, fragments);
    }

    // Resolve abstract typename from typeCondition if `__typename` was missing
    if (isAbstractType(currentType) && astMatch?.typeCondition) {
      const concreteType = schema.getType(astMatch.typeCondition);
      if (
        concreteType &&
        isObjectType(concreteType) &&
        schema.getPossibleTypes(currentType).some(c => c === concreteType)
      ) {
        currentType = concreteType;
      }
    }

    if (isObjectType(currentType) || isInterfaceType(currentType)) {
      // Map alias back to schema field, or fallback to segment if no AST match
      const fieldName = astMatch?.field.name.value ?? segment;
      const field: GraphQLField<any, any> | undefined = currentType.getFields()[fieldName];

      if (!field) {
        console.warn(
          `Hive Usage Client: Field '${fieldName}' not found on type '${currentType.name}'. Error ignored.`,
        );
        return undefined;
      }

      coordinate = `${currentType.name}.${field.name}`;
      currentType = field.type;
      selections = astMatch?.field.selectionSet?.selections;
      currentData = currentData?.[segment];
    } else {
      return undefined;
    }
  }

  return coordinate;
}
