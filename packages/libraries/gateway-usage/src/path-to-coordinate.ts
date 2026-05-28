import {
  getNamedType,
  GraphQLFieldMap,
  GraphQLSchema,
  isInterfaceType,
  isObjectType,
} from 'graphql';

export function pathToCoordinate(
  schema: GraphQLSchema,
  errorPath: readonly (string | number)[],
  operationType: 'mutation' | 'subscription' | 'query' = 'query',
): string | undefined {
  // 1. Start at the root operation type
  let currentType;
  if (operationType === 'mutation') currentType = schema.getMutationType();
  else if (operationType === 'subscription') currentType = schema.getSubscriptionType();
  else currentType = schema.getQueryType();

  let coordinate = null;

  for (const segment of errorPath) {
    // 2. Skip array indices entirely (they don't change the underlying type)
    if (typeof segment === 'number') continue;

    // 3. Unwrap Non-Null (!) and List ([]) types to get the base Object/Interface
    currentType = getNamedType(currentType);

    // 4. Ensure the current type has fields
    if (isObjectType(currentType) || isInterfaceType(currentType)) {
      const fields: GraphQLFieldMap<any, any> = currentType.getFields();
      const field = fields[segment];

      if (!field) {
        throw new Error(
          `Field '${segment}' not found on type '${currentType.name}'. Was this aliased?`,
        );
      }

      // Update the coordinate to the current Type.field
      coordinate = `${currentType.name}.${field.name}`;

      // Move deeper into the tree for the next iteration
      currentType = field.type;
    }
  }

  return coordinate ?? undefined;
}
