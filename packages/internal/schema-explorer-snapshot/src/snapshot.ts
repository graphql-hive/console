import {
  coerceInputLiteral,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
  Kind,
  type DocumentNode,
  type GraphQLArgument,
  type GraphQLInputField,
} from 'graphql';
import { extractSuperGraphInformation } from './federation-super-graph';
import { buildASTSchema } from './schema';

/** An argument or an input field. */
export type SchemaExplorerInputValueEntity = {
  name: string;
  description?: string | null;
  deprecationReason?: string | null;
  defaultValue?: unknown;
  type: string;
};

export type SchemaExplorerFieldEntity = {
  name: string;
  description?: string | null;
  deprecationReason?: string | null;
  type: string;
  args: Array<SchemaExplorerInputValueEntity>;
};

export type SchemaExplorerEnumValueEntity = {
  name: string;
  description?: string | null;
  deprecationReason?: string | null;
};

/** A materialized type, the shape the API's GraphQL mappers expose as `entity`. */
export type SchemaExplorerTypeEntity =
  | {
      kind: typeof Kind.OBJECT_TYPE_DEFINITION;
      name: string;
      description?: string | null;
      fields: Array<SchemaExplorerFieldEntity>;
      interfaces: Array<string>;
    }
  | {
      kind: typeof Kind.INTERFACE_TYPE_DEFINITION;
      name: string;
      description?: string | null;
      fields: Array<SchemaExplorerFieldEntity>;
      interfaces: Array<string>;
    }
  | {
      kind: typeof Kind.UNION_TYPE_DEFINITION;
      name: string;
      description?: string | null;
      members: Array<{ name: string }>;
    }
  | {
      kind: typeof Kind.ENUM_TYPE_DEFINITION;
      name: string;
      description?: string | null;
      values: Array<SchemaExplorerEnumValueEntity>;
    }
  | {
      kind: typeof Kind.INPUT_OBJECT_TYPE_DEFINITION;
      name: string;
      description?: string | null;
      fields: Array<SchemaExplorerInputValueEntity>;
    }
  | {
      kind: typeof Kind.SCALAR_TYPE_DEFINITION;
      name: string;
      description?: string | null;
    };

type Described = {
  description?: string | null;
  /** Subgraphs owning the coordinate (federation only). */
  ownedBy?: Array<string>;
};
type Deprecatable = { deprecationReason?: string | null };

/**
 * The entry of one schema coordinate. Types point to their children by coordinate, in SDL order:
 * `Type` → `Type.field` → `Type.field.argument`, `InputType` → `InputType.field` and
 * `Enum` → `Enum.VALUE`. Union members point to (other) types by name.
 */
export type SchemaExplorerEntry =
  | (Described & {
      kind: typeof Kind.OBJECT_TYPE_DEFINITION | typeof Kind.INTERFACE_TYPE_DEFINITION;
      interfaces: Array<string>;
      fields: Array<string>;
    })
  | (Described &
      Deprecatable & { kind: typeof Kind.FIELD_DEFINITION; type: string; args: Array<string> })
  | (Described &
      Deprecatable & {
        /** An argument or an input field. */
        kind: typeof Kind.INPUT_VALUE_DEFINITION;
        type: string;
        /** The coerced default value. */
        defaultValue?: unknown;
      })
  | (Described & { kind: typeof Kind.INPUT_OBJECT_TYPE_DEFINITION; fields: Array<string> })
  | (Described & { kind: typeof Kind.ENUM_TYPE_DEFINITION; values: Array<string> })
  | (Described & Deprecatable & { kind: typeof Kind.ENUM_VALUE_DEFINITION })
  | (Described & { kind: typeof Kind.UNION_TYPE_DEFINITION; members: Array<string> })
  | (Described & {
      kind: typeof Kind.SCALAR_TYPE_DEFINITION;
      /** Built-in scalars are part of every schema, but not of its SDL. */
      builtIn?: true;
    });

/**
 * Everything the schema explorers need from a schema version, as plain JSON keyed by schema
 * coordinate. Building it parses and walks the full composite schema and supergraph, so it is
 * cached per (immutable) schema version, see `SchemaExplorerCache`.
 */
export type SchemaExplorerSnapshot = {
  coordinates: Record<string, SchemaExplorerEntry>;
  /** All type names (without introspection types), sorted by name. */
  types: Array<string>;
  /**
   * Names of the types with a deprecated field, argument, enum value or input field, sorted by
   * name. The deprecated explorer only needs to look at these.
   */
  deprecatedTypes: Array<string>;
  queryTypeName: string | null;
  mutationTypeName: string | null;
  subscriptionTypeName: string | null;
  /** All subgraphs owning a part of the supergraph, sorted by name. */
  subgraphNames: Array<string>;
};

export function buildSchemaExplorerSnapshot(
  schemaAst: DocumentNode,
  supergraphAst: DocumentNode | null,
): SchemaExplorerSnapshot {
  const schema = buildASTSchema(schemaAst);
  const coordinates: Record<string, SchemaExplorerEntry> = {};
  const types: Array<string> = [];

  const addInputValue = (coordinate: string, value: GraphQLArgument | GraphQLInputField) => {
    coordinates[coordinate] = {
      kind: Kind.INPUT_VALUE_DEFINITION,
      description: value.description,
      deprecationReason: value.deprecationReason,
      type: value.type.toString(),
      defaultValue: value.default?.literal
        ? coerceInputLiteral(value.default.literal, value.type)
        : value.default?.value,
    };
    return coordinate;
  };

  const scalarsInSDL = new Set(
    schemaAst.definitions.flatMap(definition =>
      definition.kind === Kind.SCALAR_TYPE_DEFINITION ? [definition.name.value] : [],
    ),
  );

  const typeMap = schema.getTypeMap();
  for (const typename in typeMap) {
    if (typename.startsWith('__')) {
      continue;
    }
    const type = typeMap[typename];
    types.push(typename);

    if (isObjectType(type) || isInterfaceType(type)) {
      coordinates[typename] = {
        kind: isObjectType(type) ? Kind.OBJECT_TYPE_DEFINITION : Kind.INTERFACE_TYPE_DEFINITION,
        description: type.description,
        interfaces: type.getInterfaces().map(iface => iface.name),
        fields: Object.values(type.getFields()).map(field => {
          const fieldCoordinate = `${typename}.${field.name}`;
          coordinates[fieldCoordinate] = {
            kind: Kind.FIELD_DEFINITION,
            description: field.description,
            deprecationReason: field.deprecationReason,
            type: field.type.toString(),
            args: field.args.map(arg => addInputValue(`${fieldCoordinate}.${arg.name}`, arg)),
          };
          return fieldCoordinate;
        }),
      };
    } else if (isInputObjectType(type)) {
      coordinates[typename] = {
        kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
        description: type.description,
        fields: Object.values(type.getFields()).map(field =>
          addInputValue(`${typename}.${field.name}`, field),
        ),
      };
    } else if (isEnumType(type)) {
      coordinates[typename] = {
        kind: Kind.ENUM_TYPE_DEFINITION,
        description: type.description,
        values: type.getValues().map(value => {
          const valueCoordinate = `${typename}.${value.name}`;
          coordinates[valueCoordinate] = {
            kind: Kind.ENUM_VALUE_DEFINITION,
            description: value.description,
            deprecationReason: value.deprecationReason,
          };
          return valueCoordinate;
        }),
      };
    } else if (isUnionType(type)) {
      coordinates[typename] = {
        kind: Kind.UNION_TYPE_DEFINITION,
        description: type.description,
        members: type.getTypes().map(member => member.name),
      };
    } else if (isScalarType(type)) {
      coordinates[typename] = {
        kind: Kind.SCALAR_TYPE_DEFINITION,
        description: type.description,
        ...(isSpecifiedScalarType(type) && !scalarsInSDL.has(typename) ? { builtIn: true } : {}),
      };
    }
  }

  types.sort((a, b) => a.localeCompare(b));

  const deprecatedTypes = new Set<string>();
  for (const coordinate in coordinates) {
    const entry = coordinates[coordinate];
    if ('deprecationReason' in entry && entry.deprecationReason != null) {
      deprecatedTypes.add(coordinate.slice(0, coordinate.indexOf('.')));
    }
  }

  const subgraphNames = new Set<string>();
  if (supergraphAst) {
    const { schemaCoordinateServicesMappings } = extractSuperGraphInformation(supergraphAst);
    for (const [coordinate, serviceNames] of schemaCoordinateServicesMappings) {
      serviceNames.forEach(name => subgraphNames.add(name));
      // The supergraph also has coordinates that are not part of the public schema.
      if (Object.hasOwn(coordinates, coordinate)) {
        coordinates[coordinate].ownedBy = serviceNames;
      }
    }
  }

  return {
    coordinates,
    types,
    deprecatedTypes: Array.from(deprecatedTypes).sort((a, b) => a.localeCompare(b)),
    queryTypeName: schema.getQueryType()?.name ?? null,
    mutationTypeName: schema.getMutationType()?.name ?? null,
    subscriptionTypeName: schema.getSubscriptionType()?.name ?? null,
    subgraphNames: Array.from(subgraphNames).sort((a, b) => a.localeCompare(b)),
  };
}
