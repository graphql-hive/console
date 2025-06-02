import { parse, type DocumentNode } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { type Registry } from '@hive/api';
import { composeFederationV2 } from '@hive/schema/src/lib/compose';
import { applyTagFilterOnSubgraphs } from '@hive/schema/src/lib/federation-tag-extraction';

/**
 * Creates the public GraphQL schema from the private GraphQL Schema Registry definition.
 */
export function createPublicGraphQLSchema<TContext>(registry: Registry) {
  // Merge all modules type definitions into a single document node while excluding the `Subscription` type (for now)
  const documentNode: DocumentNode = mergeTypeDefs(registry.typeDefs, {
    throwOnConflict: true,
  });

  // Use our tag filter logic for marking everything not tagged with `@tag(name: "public")` as @inaccessible
  const [filteredSubgraph] = applyTagFilterOnSubgraphs(
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
  );

  // Compose the filtered subgraph in order to receive the public schema SDL
  const compositionResult = composeFederationV2([
    {
      typeDefs: filteredSubgraph.typeDefs,
      name: 'server',
      url: undefined,
    },
  ]);

  if (compositionResult.type === 'failure') {
    throw new Error(
      'Could not create public GraphQL schema.\nEncountered the following composition errors:\n' +
        compositionResult.result.errors.map(error => `- ${error.message}`).join('\n'),
    );
  }

  return createSchema<TContext>({
    typeDefs: parse(compositionResult.result.sdl),
    resolvers: registry.resolvers,
    resolverValidationOptions: {
      // The resolvers still contain the ones of the public schema
      // Instead of filtering them out ignoring it is good enough.
      requireResolversToMatchSchema: 'ignore',
    },
  });
}
