import type { GraphQLObjectTypeMapper, SchemaExplorerMapper } from '../module.graphql.mappers';
import { Kind } from 'graphql';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { fieldsSupergraph, memo, toNamedTypeMapper, withUsedByClients } from '../utils';
import type { SchemaExplorerResolvers } from './../../../__generated__/types';

type UsageLoader = GraphQLObjectTypeMapper['usage'];

export const SchemaExplorer: SchemaExplorerResolvers = {
  type: async (source, { name }, { injector }) => {
    const entity = source.snapshot.getTypeEntity(name);
    if (!entity) {
      return null;
    }

    return toNamedTypeMapper(
      entity,
      typeUsageLoader(source, entity.name, injector.get(OperationsManager)),
      source.supergraph,
    );
  },
  types: ({ snapshot, usage, supergraph }, _, { injector }) => {
    const operationsManager = injector.get(OperationsManager);

    const getStats = memo(
      async function _getStats(typename: string) {
        const stats = await operationsManager.countCoordinatesOfTarget({
          targetId: usage.targetId,
          organizationId: usage.organizationId,
          projectId: usage.projectId,
          period: usage.period,
        });

        return withUsedByClients(stats, {
          selector: usage,
          period: usage.period,
          operationsManager,
          typename,
        });
      },
      arg => arg,
    );

    return snapshot
      .getTypeNames({ withBuiltInScalars: true })
      .flatMap(typename => snapshot.getLazyTypeEntity(typename) ?? [])
      .map(entity => toNamedTypeMapper(entity, () => getStats(entity.name), supergraph));
  },
  query: (source, _, { injector }) =>
    rootTypeMapper(source, source.snapshot.queryTypeName, injector.get(OperationsManager)),
  mutation: (source, _, { injector }) =>
    rootTypeMapper(source, source.snapshot.mutationTypeName, injector.get(OperationsManager)),
  subscription: (source, _, { injector }) =>
    rootTypeMapper(source, source.snapshot.subscriptionTypeName, injector.get(OperationsManager)),
  metadataAttributes: async ({ supergraph }, _arg, _ctx) => {
    return supergraph?.metadataAttributes;
  },
  subgraphNames: ({ supergraph }) => supergraph?.subgraphNames ?? [],
};

function typeUsageLoader(
  source: SchemaExplorerMapper,
  typename: string,
  operationsManager: OperationsManager,
): UsageLoader {
  const { usage } = source;
  return () =>
    operationsManager
      .countCoordinatesOfType({
        typename,
        organizationId: usage.organizationId,
        projectId: usage.projectId,
        targetId: usage.targetId,
        period: usage.period,
      })
      .then(stats =>
        withUsedByClients(stats, {
          selector: usage,
          period: usage.period,
          operationsManager,
          typename,
        }),
      );
}

function rootTypeMapper(
  source: SchemaExplorerMapper,
  typename: string | null,
  operationsManager: OperationsManager,
): GraphQLObjectTypeMapper | null {
  const entity = typename ? source.snapshot.getTypeEntity(typename) : null;
  if (!entity || entity.kind !== Kind.OBJECT_TYPE_DEFINITION) {
    return null;
  }

  return {
    entity,
    usage: typeUsageLoader(source, entity.name, operationsManager),
    supergraph: fieldsSupergraph(entity.name, source.supergraph),
  };
}
