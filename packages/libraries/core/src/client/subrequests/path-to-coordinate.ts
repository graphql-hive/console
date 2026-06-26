import {
  getNamedType,
  GraphQLType,
  isInterfaceType,
  isObjectType,
  type GraphQLFieldMap,
  type GraphQLSchema,
} from 'graphql';

function resolveRootType(
  schema: GraphQLSchema,
  operationType: 'mutation' | 'subscription' | 'query',
): GraphQLType | undefined | null {
  if (operationType === 'mutation') {
    return schema.getMutationType();
  } else if (operationType === 'subscription') {
    return schema.getSubscriptionType();
  }
  return schema.getQueryType();
}

export function pathToCoordinate(
  schema: GraphQLSchema,
  errorPath: readonly (string | number)[],
  operationType: 'mutation' | 'subscription' | 'query' = 'query',
): string | undefined {
  let currentType = resolveRootType(schema, operationType);
  let coordinate = null;

  for (const segment of errorPath) {
    // Skip array indices entirely (they don't change the underlying type)
    if (typeof segment === 'number') continue;
    currentType = getNamedType(currentType);

    if (isObjectType(currentType) || isInterfaceType(currentType)) {
      const fields: GraphQLFieldMap<any, any> = currentType.getFields();
      const field = fields[segment];

      if (!field) {
        console.warn(
          `Hive Usage Client: Field '${segment}' not found on type '${currentType.name}'. Was this aliased? Error ignored.`,
        );
        return;
      }

      coordinate = `${currentType.name}.${field.name}`;
      currentType = field.type;
    }
  }

  return coordinate ?? undefined;
}
