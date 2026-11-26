import {
  ExplorerSupergraph,
  GraphQLNamedTypeMapper,
  GraphQLObjectTypeMapper,
  SchemaCoordinateUsageForUnusedExplorer,
  SchemaCoordinateUsageMapper,
  WithGraphQLParentInfo,
  WithSchemaCoordinatesUsage,
} from './module.graphql.mappers';
import stringify from 'fast-json-stable-stringify';
import { Kind } from 'graphql';
import type { SchemaExplorerTypeEntity } from '@hive/schema-explorer-snapshot';
import type { DateRange } from '../../shared/entities';
import type { PromiseOrValue } from '../../shared/helpers';
import { OperationsManager } from '../operations/providers/operations-manager';
import { TargetSelector } from '../shared/providers/storage';

export function withUsedByClients<
  T extends {
    isUsed: boolean;
  },
>(
  input: Record<string, T>,
  deps: {
    operationsManager: OperationsManager;
    selector: TargetSelector;
    period: DateRange;
    typename: string;
  },
): Record<
  string,
  T & {
    usedByClients: () => PromiseOrValue<Array<string>>;
    period: DateRange;
    organizationId: string;
    projectId: string;
    targetId: string;
    typename: string;
  }
> {
  // input can contain ALLLLLLLLLL the schema coordinates.
  // in order to be more efficient we lazily create the properties here as we could accidentially create way tooo much stuff!
  return new Proxy(input, {
    get(target, property, receiver) {
      if (
        typeof property !== 'string' ||
        /** some code might check if this is a promise :D */
        property === 'then'
      ) {
        return Reflect.get(target, property, receiver);
      }

      // Guard against trying to look up properties that do not belong to this typename!
      if (!property.startsWith(deps.typename)) {
        return undefined;
      }

      const schemaCoordinate = property;
      const record = input[property];

      if (!record) {
        return undefined;
      }

      return {
        selector: deps.selector,
        period: deps.period,
        typename: deps.typename,
        organizationId: deps.selector.organizationId,
        projectId: deps.selector.projectId,
        targetId: deps.selector.targetId,
        ...record,
        usedByClients() {
          if (record.isUsed === false) {
            return [];
          }

          // It's using DataLoader under the hood so it's safe to call it multiple times for different coordinates
          return deps.operationsManager.getClientNamesPerCoordinateOfType({
            ...deps.selector,
            period: deps.period,
            schemaCoordinate,
          });
        },
      };
    },
  }) as Record<
    string,
    T & {
      usedByClients: () => PromiseOrValue<Array<string>>;
      period: DateRange;
      organizationId: string;
      projectId: string;
      targetId: string;
      typename: string;
    }
  >;
}

export function toObjectTypeSupergraphMapper(
  typename: string,
  supergraph: ExplorerSupergraph | null,
): GraphQLObjectTypeMapper['supergraph'] {
  if (!supergraph) {
    return null;
  }
  return {
    getFieldMetadata: fieldName => supergraph.getMetadata(`${typename}.${fieldName}`),
    ownedByServiceNames: supergraph.getOwnedByServices(typename),
    getFieldOwnedByServices: fieldName => supergraph.getOwnedByServices(`${typename}.${fieldName}`),
  };
}

export function toNamedTypeMapper(
  entity: SchemaExplorerTypeEntity,
  usage: GraphQLObjectTypeMapper['usage'],
  supergraph: ExplorerSupergraph | null,
): GraphQLNamedTypeMapper {
  const getOwnedByServices = (coordinate: string) =>
    supergraph?.getOwnedByServices(coordinate) ?? null;

  const typename = entity.name;

  switch (entity.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return { entity, usage, supergraph: toObjectTypeSupergraphMapper(typename, supergraph) };
    case Kind.INTERFACE_TYPE_DEFINITION:
      return { entity, usage, supergraph: toObjectTypeSupergraphMapper(typename, supergraph) };
    case Kind.ENUM_TYPE_DEFINITION:
      return {
        entity,
        usage,
        supergraph: supergraph
          ? {
              ownedByServiceNames: getOwnedByServices(typename),
              getEnumValueOwnedByServices: valueName =>
                getOwnedByServices(`${typename}.${valueName}`),
            }
          : null,
      };
    case Kind.UNION_TYPE_DEFINITION:
      return {
        entity,
        usage,
        supergraph: supergraph
          ? {
              ownedByServiceNames: getOwnedByServices(typename),
              getUnionMemberOwnedByServices: memberName => getOwnedByServices(memberName),
            }
          : null,
      };
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return {
        entity,
        usage,
        supergraph: supergraph
          ? {
              ownedByServiceNames: getOwnedByServices(typename),
              getInputFieldOwnedByServices: inputFieldName =>
                getOwnedByServices(`${typename}.${inputFieldName}`),
            }
          : null,
      };
    case Kind.SCALAR_TYPE_DEFINITION:
      return {
        entity,
        usage,
        supergraph: supergraph ? { ownedByServiceNames: getOwnedByServices(typename) } : null,
      };
  }
}

export function __isTypeOf<
  T extends GraphQLNamedTypeMapper,
  K extends GraphQLNamedTypeMapper['entity']['kind'],
>(kind: K): (type: T) => boolean {
  return ({ entity }: { entity: GraphQLNamedTypeMapper['entity'] }) => entity.kind === kind;
}

function isSchemaCoordinateUsageForUnusedExplorer(
  value: unknown,
): value is SchemaCoordinateUsageForUnusedExplorer {
  return 'isUsed' in (value as any);
}

export function usage(
  source:
    | WithSchemaCoordinatesUsage<{
        entity: {
          name: string;
        };
      }>
    | WithGraphQLParentInfo<
        WithSchemaCoordinatesUsage<{
          entity: {
            name: string;
          };
        }>
      >,
  _: unknown,
): Promise<SchemaCoordinateUsageMapper> | SchemaCoordinateUsageMapper {
  const coordinate =
    'parent' in source ? `${source.parent.coordinate}.${source.entity.name}` : source.entity.name;

  const usage = source.usage();

  if (isSchemaCoordinateUsageForUnusedExplorer(usage)) {
    if (usage.usedCoordinates.has(coordinate)) {
      return {
        // TODO: This is a hack to mark the field as used but without passing exact number as we don't need the exact number in "Unused schema view".
        total: 1,
        totalResolutions: 1,
        errorTotal: null,
        isUsed: true,
        usedByClients: () => [],
        period: usage.period,
        organizationId: usage.organizationId,
        projectId: usage.projectId,
        targetId: usage.targetId,
        coordinate: coordinate,
      };
    }

    return {
      total: 0,
      totalResolutions: 0,
      errorTotal: null,
      isUsed: false,
      usedByClients: () => [],
    };
  }

  return Promise.resolve(usage).then(usage => {
    const coordinateUsage = usage[coordinate];

    return coordinateUsage && coordinateUsage.total > 0
      ? {
          total: coordinateUsage.total,
          totalResolutions: coordinateUsage.totalResolutions,
          errorTotal: coordinateUsage.errorTotal,
          isUsed: true,
          usedByClients: coordinateUsage.usedByClients,
          period: coordinateUsage.period,
          organizationId: coordinateUsage.organizationId,
          projectId: coordinateUsage.projectId,
          targetId: coordinateUsage.targetId,
          coordinate: coordinate,
        }
      : {
          total: 0,
          totalResolutions: 0,
          errorTotal: null,
          isUsed: false,
          usedByClients: () => [],
        };
  });
}

export function stringifyDefaultValue(value: unknown): string | null {
  if (typeof value !== 'undefined') {
    return stringify(value);
  }
  return null;
}

export function memo<R, A, K>(fn: (arg: A) => R, cacheKeyFn: (arg: A) => K): (arg: A) => R {
  let memoizedResult: R | null = null;
  let memoizedKey: K | null = null;

  return (arg: A) => {
    const currentKey = cacheKeyFn(arg);
    if (memoizedKey === currentKey) {
      return memoizedResult!;
    }

    memoizedKey = currentKey;
    memoizedResult = fn(arg);

    return memoizedResult;
  };
}
