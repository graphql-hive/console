import {
  GraphQLEnumTypeMapper,
  GraphQLInputObjectTypeMapper,
  GraphQLInterfaceTypeMapper,
  GraphQLNamedTypeMapper,
  GraphQLObjectTypeMapper,
  GraphQLScalarTypeMapper,
  GraphQLUnionTypeMapper,
  SchemaCoordinateUsageForUnusedExplorer,
  SchemaCoordinateUsageMapper,
  WithGraphQLParentInfo,
  WithSchemaCoordinatesUsage,
} from './module.graphql.mappers';
import stringify from 'fast-json-stable-stringify';
import { ConstDirectiveNode, DEFAULT_DEPRECATION_REASON, DocumentNode, Kind, print } from 'graphql';
import { traceInlineSync } from '@hive/service-common';
import type { DateRange } from '../../shared/entities';
import type { PromiseOrValue } from '../../shared/helpers';
import { OperationsManager } from '../operations/providers/operations-manager';
import { TargetSelector } from '../shared/providers/storage';
import { SuperGraphInformation } from './lib/federation-super-graph';

export const withUsedByClients = traceInlineSync(
  'withUsedByClients',
  {},
  function withUsedByClients<
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
  },
);

function deprecationReasonFromDirectives(directives: readonly ConstDirectiveNode[] | undefined) {
  if (!directives) {
    return null;
  }

  const deprecatedDirective = directives.find(d => d.name.value === 'deprecated');

  if (!deprecatedDirective) {
    return null;
  }

  const reasonArgument = deprecatedDirective.arguments?.find(a => a.name.value === 'reason');

  if (!reasonArgument) {
    return DEFAULT_DEPRECATION_REASON;
  }

  if (reasonArgument.value.kind !== 'StringValue') {
    throw new Error('Expected @deprecated(reason:) to be StringValue');
  }

  return reasonArgument.value.value;
}

export function buildGraphQLTypesFromSDL(
  sdl: DocumentNode,
  getStats: (
    typeName: string,
  ) => ReturnType<
    | GraphQLObjectTypeMapper['usage']
    | GraphQLInterfaceTypeMapper['usage']
    | GraphQLUnionTypeMapper['usage']
    | GraphQLEnumTypeMapper['usage']
    | GraphQLInputObjectTypeMapper['usage']
    | GraphQLScalarTypeMapper['usage']
  >,
  supergraph: SuperGraphInformation | null,
) {
  const types: Array<
    | GraphQLObjectTypeMapper
    | GraphQLInterfaceTypeMapper
    | GraphQLUnionTypeMapper
    | GraphQLEnumTypeMapper
    | GraphQLInputObjectTypeMapper
    | GraphQLScalarTypeMapper
  > = [];

  for (const typeDefinition of sdl.definitions) {
    if (typeDefinition.kind === Kind.OBJECT_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.OBJECT_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
          interfaces: typeDefinition.interfaces?.map(i => i.name.value) ?? [],
          fields:
            typeDefinition.fields?.map(f => ({
              name: f.name.value,
              description: f.description?.value,
              type: print(f.type),
              deprecationReason: deprecationReasonFromDirectives(f.directives),
              args:
                f.arguments?.map(a => ({
                  name: a.name.value,
                  description: a.description?.value,
                  deprecationReason: deprecationReasonFromDirectives(a.directives),
                  type: print(a.type),
                })) ?? [],
            })) ?? [],
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              getFieldMetadata: (fieldName: string) =>
                supergraph.schemaCoordinateMetadataMappings?.get(
                  `${typeDefinition.name.value}.${fieldName}`,
                ) ?? null,
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
              getFieldOwnedByServices: (fieldName: string) =>
                supergraph.schemaCoordinateServicesMappings.get(
                  `${typeDefinition.name.value}.${fieldName}`,
                ) ?? null,
            }
          : null,
      } satisfies GraphQLObjectTypeMapper);
    } else if (typeDefinition.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.INTERFACE_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
          interfaces: typeDefinition.interfaces?.map(i => i.name.value) ?? [],
          fields:
            typeDefinition.fields?.map(f => ({
              name: f.name.value,
              description: f.description?.value,
              deprecationReason: deprecationReasonFromDirectives(f.directives),
              type: print(f.type),
              args:
                f.arguments?.map(a => ({
                  name: a.name.value,
                  description: a.description?.value,
                  deprecationReason: deprecationReasonFromDirectives(a.directives),
                  type: print(a.type),
                })) ?? [],
            })) ?? [],
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              getFieldMetadata: (fieldName: string) =>
                supergraph.schemaCoordinateMetadataMappings?.get(
                  `${typeDefinition.name.value}.${fieldName}`,
                ) ?? null,
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
              getFieldOwnedByServices: (fieldName: string) =>
                supergraph.schemaCoordinateServicesMappings.get(
                  `${typeDefinition.name.value}.${fieldName}`,
                ) ?? null,
            }
          : null,
      } satisfies GraphQLInterfaceTypeMapper);
    } else if (typeDefinition.kind === Kind.ENUM_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.ENUM_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
          values:
            typeDefinition.values?.map(value => ({
              name: value.name.value,
              description: value.description?.value,
              deprecationReason: deprecationReasonFromDirectives(value.directives),
            })) ?? [],
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
              getEnumValueOwnedByServices: (fieldName: string) =>
                supergraph.schemaCoordinateServicesMappings.get(
                  `${typeDefinition.name.value}.${fieldName}`,
                ) ?? null,
            }
          : null,
      } satisfies GraphQLEnumTypeMapper);
    } else if (typeDefinition.kind === Kind.UNION_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.UNION_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
          members:
            typeDefinition.types?.map(t => ({
              name: t.name.value,
            })) ?? [],
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
              getUnionMemberOwnedByServices: (memberName: string) =>
                supergraph.schemaCoordinateServicesMappings.get(memberName) ?? null,
            }
          : null,
      } satisfies GraphQLUnionTypeMapper);
    } else if (typeDefinition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
          fields:
            typeDefinition.fields?.map(f => ({
              name: f.name.value,
              defaultValue: f.defaultValue ? print(f.defaultValue) : undefined,
              description: f.description?.value,
              deprecationReason: deprecationReasonFromDirectives(f.directives),
              type: print(f.type),
            })) ?? [],
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
              getInputFieldOwnedByServices: (inputFieldName: string) =>
                supergraph.schemaCoordinateServicesMappings.get(
                  `${typeDefinition.name.value}.${inputFieldName}`,
                ) ?? null,
            }
          : null,
      } satisfies GraphQLInputObjectTypeMapper);
    } else if (typeDefinition.kind === Kind.SCALAR_TYPE_DEFINITION) {
      types.push({
        entity: {
          kind: Kind.SCALAR_TYPE_DEFINITION,
          name: typeDefinition.name.value,
          description: typeDefinition.description?.value,
        },
        usage() {
          return getStats(typeDefinition.name.value);
        },
        supergraph: supergraph
          ? {
              ownedByServiceNames:
                supergraph.schemaCoordinateServicesMappings.get(typeDefinition.name.value) ?? null,
            }
          : null,
      } satisfies GraphQLScalarTypeMapper);
    }
  }

  return types;
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
      isUsed: false,
      usedByClients: () => [],
    };
  }

  return Promise.resolve(usage).then(usage => {
    const coordinateUsage = usage[coordinate];

    return coordinateUsage && coordinateUsage.total > 0
      ? {
          total: coordinateUsage.total,
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
