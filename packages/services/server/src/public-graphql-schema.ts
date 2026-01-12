import { parse, type DocumentNode } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { type Registry } from '@hive/api';
import { composeSchemaContract } from '@theguild/federation-composition';

/**
 * Creates the public GraphQL schema from the private GraphQL Schema Registry definition.
 */
export function createPublicGraphQLSchema<TContext>(registry: Registry) {
  // Merge all modules type definitions into a single document node while excluding the `Subscription` type (for now)
  const documentNode: DocumentNode = mergeTypeDefs(registry.typeDefs, {
    throwOnConflict: true,
  });

  const compositionResult = composeSchemaContract(
    [
      {
        name: 'public',
        typeDefs: documentNode,
      },
    ],
    {
      include: new Set(['public']),
      exclude: new Set(),
    },
    true,
  );

  if (compositionResult.errors) {
    throw new Error(
      'Could not create public GraphQL schema.\nEncountered the following composition errors:\n' +
        compositionResult.errors.map(error => `- ${error.message}`).join('\n'),
    );
  }

  return createSchema<TContext>({
    typeDefs: parse(compositionResult.publicSdl),
    resolvers: registry.resolvers,
    resolverValidationOptions: {
      // The resolvers still contain the ones of the public schema
      // Instead of filtering them out ignoring it is good enough.
      requireResolversToMatchSchema: 'ignore',
    },
  });
}
