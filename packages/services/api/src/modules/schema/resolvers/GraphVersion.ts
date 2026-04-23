import { GraphVariants } from '../providers/graph-variants';
import type { GraphVersionResolvers, ResolversUnionTypes } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "GraphVersionMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const GraphVersion: GraphVersionResolvers = {
  hasSchemaChanges(version) {
    return !!version.publicSchemaChanges?.length;
  },
  isComposable(version) {
    // TODO: contracts?
    return version.schemaCompositionErrors === null;
  },
  isFirstComposableVersion(version) {
    return !version.schemaCompositionErrors && !version.previousGraphVariantVersionId;
  },
  isValid(version) {
    return version.schemaCompositionErrors === null;
  },
  previousDiffableGraphVersion: async (version, _, { injector }) => {
    return injector.get(GraphVariants).getPreviousDiffableGraphVersionForGraphVersion(version);
  },
  sdlChanges: async (version, _arg, _ctx) => {
    return version.publicSchemaChanges;
  },
  supergraphChanges: async (version, _arg, _ctx) => {
    return version.supergraphSchemaChanges;
  },
  sdl: async (version, _arg, _ctx) => {
    return version.publicSdl;
  },
  subgraphDiffs: async (version, _, { injector }) => {
    const diffs = await injector.get(GraphVariants).getSubgraphDiffForGraphVariantVersion(version);

    return diffs.map(diff => {
      if (diff.type === 'unchanged') {
        return {
          __typename: 'SubgraphDiffUnchanged',
          subgraphVersion: {
            id: diff.log.id,
            sdl: diff.log.sdl,
            serviceName: diff.log.serviceName,
            url: diff.log.serviceUrl,
          },
        } satisfies ResolversUnionTypes<any>['SubgraphDiff'];
      }
      if (diff.type === 'added') {
        return {
          __typename: 'SubgraphDiffAdded',
          addedSubgraphVersion: {
            id: diff.log.id,
            sdl: diff.log.sdl,
            serviceName: diff.log.serviceName,
            url: diff.log.serviceUrl,
          },
        } satisfies ResolversUnionTypes<any>['SubgraphDiff'];
      }
      if (diff.type === 'changed') {
        return {
          __typename: 'SubgraphDiffChanged',
          previousSubgraphVersion: {
            id: diff.previousLog.id,
            sdl: diff.previousLog.sdl,
            serviceName: diff.previousLog.serviceName,
            url: diff.previousLog.serviceUrl,
          },
          subgraphVersion: {
            id: diff.log.id,
            sdl: diff.log.sdl,
            serviceName: diff.log.serviceName,
            url: diff.log.serviceUrl,
          },
          changes: diff.changes,
        } satisfies ResolversUnionTypes<any>['SubgraphDiff'];
      }
      if (diff.type === 'removed') {
        return {
          __typename: 'SubgraphDiffRemoved',
          removedSubgraphVersion: {
            id: diff.previousLog.id,
            sdl: diff.previousLog.sdl,
            serviceName: diff.previousLog.serviceName,
            url: diff.previousLog.serviceUrl,
          },
        } satisfies ResolversUnionTypes<any>['SubgraphDiff'];
      }

      throw new Error('Noop');
    });
  },
  origin: async (version, _arg, _ctx) => {
    if (version.origin.type === 'graphVersionPromotion') {
      return {
        __typename: 'GraphVersionPromotionOrigin',
        sourceGraphName: version.origin.sourceGraphName,
        sourceGraphVersionId: version.origin.sourceGraphVersionId,
      } satisfies ResolversUnionTypes<any>['GraphVersionOrigin'];
    }
    if (version.origin.type === 'subgraphPublish') {
      return {
        __typename: 'SubgraphPublishOrigin',
        publishedSubgraphs: version.origin.subgraphs,
      };
    }

    throw new Error('Noop');
  },
};
