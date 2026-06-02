import { GraphQLSchema, Kind, print } from 'graphql';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';

/** Prints the SDL but excludes the schema definition if it is the standard definition */
export function printCleanSchema(schema: GraphQLSchema): string {
  const documentNode = getDocumentNodeFromSchema(schema);

  const filteredDefinitions = documentNode.definitions.filter(node => {
    if (node.kind === Kind.SCHEMA_DEFINITION) {
      const hasDirectives = node.directives && node.directives.length > 0;
      const hasDescription = !!node.description;

      const isStandardDefinition = node.operationTypes.every(op => {
        if (op.operation === 'query' && op.type.name.value === 'Query') return true;
        if (op.operation === 'mutation' && op.type.name.value === 'Mutation') return true;
        if (op.operation === 'subscription' && op.type.name.value === 'Subscription') return true;
        return false;
      });

      // Omit the block only if it has no directives/descriptions and uses standard names
      if (!hasDirectives && !hasDescription && isStandardDefinition) {
        return false;
      }
    }
    return true;
  });

  return print({
    ...documentNode,
    definitions: filteredDefinitions,
  });
}
