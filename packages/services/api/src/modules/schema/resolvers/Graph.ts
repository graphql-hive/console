import { GraphVariants } from '../providers/graph-variants';
import type { GraphResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "GraphMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const Graph: GraphResolvers = {
  /* Implement Graph resolver logic here */
  isActive(graph) {
    return graph.retiredAt === null;
  },
  latestGraphVersion: async (_parent, _arg, _ctx) => {
    /* Graph.latestGraphVersion resolver is required because Graph.latestGraphVersion exists but GraphMapper.latestGraphVersion does not */
  },
  versions: async (graph, args, { injector }) => {
    return injector.get(GraphVariants).getPaginatedGraphVariantVersionsForGraphVariant(graph, {
      first: args.first,
      after: args.after ?? null,
    });
  },
  graphVersion: async (graph, args, { injector }) => {
    return injector.get(GraphVariants).getGraphVariantVersionByIdForGraphVariant(graph, args.id);
  },
};
