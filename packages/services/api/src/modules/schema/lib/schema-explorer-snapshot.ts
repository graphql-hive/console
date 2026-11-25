import type {
  GraphQLEnumTypeMapper,
  GraphQLFieldMapper,
  GraphQLInputObjectTypeMapper,
  GraphQLInterfaceTypeMapper,
  GraphQLObjectTypeMapper,
  GraphQLScalarTypeMapper,
  GraphQLUnionTypeMapper,
} from '../module.graphql.mappers';
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
import { LRUCache } from 'lru-cache';
import { buildASTSchema } from '../../../shared/schema';
import { extractSuperGraphInformation } from './federation-super-graph';

export type SchemaExplorerTypeEntity =
  | GraphQLObjectTypeMapper['entity']
  | GraphQLInterfaceTypeMapper['entity']
  | GraphQLUnionTypeMapper['entity']
  | GraphQLEnumTypeMapper['entity']
  | GraphQLInputObjectTypeMapper['entity']
  | GraphQLScalarTypeMapper['entity'];

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

// ---------------------------------------------------------------------------------------------
// Binary format
//
// The snapshot of a large schema is tens of MB; decoding all of it on every request costs hundreds
// of milliseconds. The binary form is read in place instead: opening it only parses a small
// header, and the entries of a type are decoded when that type is first needed.
//
//   bytes 0-3   "HSE" + format version (one byte)
//   bytes 4-7   header length H (uint32 LE)
//   bytes 8..   header JSON (H bytes), followed by the data section:
//               - the coordinate index: one line per type (in header order) with the
//                 coordinates of its fields, arguments, input fields and enum values
//               - one JSON chunk per type: `{ [coordinate]: entry }` for the type and its children

/** Bump when the binary layout or the entries change, so stale snapshots are not read. */
export const SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION = 1;

const MAGIC = 'HSE';

type TypeKind = Extract<SchemaExplorerEntry['kind'], `${string}TypeDefinition`>;

type SnapshotHeader = Omit<SchemaExplorerSnapshot, 'coordinates' | 'types'> & {
  /** Sorted by name: name, kind, chunk offset and length in the data section, owners, built-in. */
  types: Array<
    [
      name: string,
      kind: TypeKind,
      offset: number,
      length: number,
      ownedBy: Array<string> | null,
      builtIn: 0 | 1,
    ]
  >;
  /** Offset and length of the coordinate index in the data section. */
  coordinateIndex: [offset: number, length: number];
};

export function encodeSchemaExplorerSnapshot(snapshot: SchemaExplorerSnapshot): Buffer {
  const entriesByType = new Map<string, Record<string, SchemaExplorerEntry>>(
    snapshot.types.map(typename => [typename, {}]),
  );
  for (const coordinate in snapshot.coordinates) {
    const dot = coordinate.indexOf('.');
    const typename = dot === -1 ? coordinate : coordinate.slice(0, dot);
    entriesByType.get(typename)![coordinate] = snapshot.coordinates[coordinate];
  }

  const coordinateIndex = Buffer.from(
    snapshot.types
      .map(typename =>
        Object.keys(entriesByType.get(typename)!)
          .filter(c => c !== typename)
          .join(' '),
      )
      .join('\n'),
  );

  const chunks: Array<Buffer> = [coordinateIndex];
  let offset = coordinateIndex.length;
  const types: SnapshotHeader['types'] = snapshot.types.map(typename => {
    const chunk = Buffer.from(JSON.stringify(entriesByType.get(typename)));
    const entry = snapshot.coordinates[typename];
    const location: SnapshotHeader['types'][number] = [
      typename,
      entry.kind as TypeKind,
      offset,
      chunk.length,
      entry.ownedBy ?? null,
      entry.kind === Kind.SCALAR_TYPE_DEFINITION && entry.builtIn ? 1 : 0,
    ];
    chunks.push(chunk);
    offset += chunk.length;
    return location;
  });

  const { coordinates: _, types: __, ...meta } = snapshot;
  const header: SnapshotHeader = {
    ...meta,
    types,
    coordinateIndex: [0, coordinateIndex.length],
  };
  const headerBytes = Buffer.from(JSON.stringify(header));
  const prefix = Buffer.alloc(8);
  prefix.write(MAGIC, 0, 'latin1');
  prefix.writeUInt8(SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION, 3);
  prefix.writeUInt32LE(headerBytes.length, 4);
  return Buffer.concat([prefix, headerBytes, ...chunks]);
}

/** The properties of each kind of type entity besides `kind` and `name`. */
const LAZY_TYPE_PROPERTIES: Record<TypeKind, ReadonlyArray<string>> = {
  [Kind.OBJECT_TYPE_DEFINITION]: ['description', 'interfaces', 'fields'],
  [Kind.INTERFACE_TYPE_DEFINITION]: ['description', 'interfaces', 'fields'],
  [Kind.INPUT_OBJECT_TYPE_DEFINITION]: ['description', 'fields'],
  [Kind.ENUM_TYPE_DEFINITION]: ['description', 'values'],
  [Kind.UNION_TYPE_DEFINITION]: ['description', 'members'],
  [Kind.SCALAR_TYPE_DEFINITION]: ['description'],
};

type LazyTypeEntityClass = new (
  kind: TypeKind,
  name: string,
  load: () => SchemaExplorerTypeEntity,
) => { kind: TypeKind; name: string };

/**
 * One class per kind, with a getter per property on the prototype that decodes the type on first
 * access. Creating an instance only sets `kind` and `name`, which keeps listing thousands of
 * types cheap.
 */
const LAZY_TYPE_ENTITY_CLASSES = Object.fromEntries(
  Object.entries(LAZY_TYPE_PROPERTIES).map(([kind, properties]) => {
    class LazyTypeEntity {
      #load: () => SchemaExplorerTypeEntity;
      #loaded: Record<string, unknown> | null = null;

      constructor(
        public kind: TypeKind,
        public name: string,
        load: () => SchemaExplorerTypeEntity,
      ) {
        this.#load = load;
      }

      static get(entity: LazyTypeEntity, property: string) {
        entity.#loaded ??= entity.#load() as unknown as Record<string, unknown>;
        return entity.#loaded[property];
      }
    }
    for (const property of properties) {
      Object.defineProperty(LazyTypeEntity.prototype, property, {
        enumerable: true,
        get(this: LazyTypeEntity) {
          return LazyTypeEntity.get(this, property);
        },
      });
    }
    return [kind, LazyTypeEntity];
  }),
) as unknown as Record<TypeKind, LazyTypeEntityClass>;

/** The last segment of a schema coordinate, e.g. `id` for `Query.user.id`. */
function nameOf(coordinate: string) {
  return coordinate.slice(coordinate.lastIndexOf('.') + 1);
}

/**
 * Reads a binary snapshot in place. Only the header is parsed up front; the entries of a type are
 * decoded on first access, and the most recently used ones are kept decoded.
 */
export class SchemaExplorerSnapshotReader {
  private typeIndex: Map<string, number>;
  private decoded = new LRUCache<string, Record<string, SchemaExplorerEntry>>({ max: 1000 });
  private dataOffset: number;

  private constructor(
    private buffer: Buffer,
    private header: SnapshotHeader,
    headerLength: number,
  ) {
    this.dataOffset = 8 + headerLength;
    this.typeIndex = new Map(header.types.map(([name], index) => [name, index]));
  }

  /** Returns null if the buffer is not a snapshot of the current format. */
  static fromBuffer(buffer: Buffer): SchemaExplorerSnapshotReader | null {
    if (
      buffer.length < 8 ||
      buffer.toString('latin1', 0, 3) !== MAGIC ||
      buffer.readUInt8(3) !== SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION
    ) {
      return null;
    }
    const headerLength = buffer.readUInt32LE(4);
    const header: SnapshotHeader = JSON.parse(buffer.toString('utf8', 8, 8 + headerLength));
    return new SchemaExplorerSnapshotReader(buffer, header, headerLength);
  }

  static fromSnapshot(snapshot: SchemaExplorerSnapshot) {
    return SchemaExplorerSnapshotReader.fromBuffer(encodeSchemaExplorerSnapshot(snapshot))!;
  }

  /** Size of the binary snapshot in bytes. */
  get byteLength() {
    return this.buffer.length;
  }

  /** The binary snapshot, e.g. for storing it. */
  toBuffer() {
    return this.buffer;
  }

  get queryTypeName() {
    return this.header.queryTypeName;
  }
  get mutationTypeName() {
    return this.header.mutationTypeName;
  }
  get subscriptionTypeName() {
    return this.header.subscriptionTypeName;
  }
  /** All subgraphs owning a part of the supergraph, sorted by name. */
  get subgraphNames() {
    return this.header.subgraphNames;
  }
  /** Types with a deprecated field, argument, enum value or input field, sorted by name. */
  get deprecatedTypes() {
    return this.header.deprecatedTypes;
  }

  /** All type names, sorted by name. */
  getTypeNames({ withBuiltInScalars }: { withBuiltInScalars: boolean }): Array<string> {
    return this.header.types
      .filter(([, , , , , builtIn]) => withBuiltInScalars || builtIn === 0)
      .map(([name]) => name);
  }

  private entriesOf(typename: string): Record<string, SchemaExplorerEntry> | null {
    const index = this.typeIndex.get(typename);
    if (index === undefined) {
      return null;
    }
    let entries = this.decoded.get(typename);
    if (!entries) {
      const [, , offset, length] = this.header.types[index];
      const start = this.dataOffset + offset;
      entries = JSON.parse(this.buffer.toString('utf8', start, start + length)) as Record<
        string,
        SchemaExplorerEntry
      >;
      this.decoded.set(typename, entries);
    }
    return entries;
  }

  /** The entry of a schema coordinate. */
  getEntry(coordinate: string): SchemaExplorerEntry | null {
    const dot = coordinate.indexOf('.');
    const entries = this.entriesOf(dot === -1 ? coordinate : coordinate.slice(0, dot));
    return entries && Object.hasOwn(entries, coordinate) ? entries[coordinate] : null;
  }

  /** The subgraphs owning a schema coordinate. Types are answered from the header. */
  getOwnedBy(coordinate: string): Array<string> | null {
    if (!coordinate.includes('.')) {
      const index = this.typeIndex.get(coordinate);
      return index === undefined ? null : this.header.types[index][4];
    }
    return this.getEntry(coordinate)?.ownedBy ?? null;
  }

  /**
   * Assembles a type with its fields, arguments or values from its entries.
   * Returns null if there is no such type.
   */
  getTypeEntity(typename: string): SchemaExplorerTypeEntity | null {
    const entries = this.entriesOf(typename);
    const entry = entries?.[typename];
    if (!entries || !entry) {
      return null;
    }

    const child = <TKind extends SchemaExplorerEntry['kind']>(coordinate: string, kind: TKind) => {
      const childEntry = Object.hasOwn(entries, coordinate) ? entries[coordinate] : null;
      if (childEntry?.kind !== kind) {
        throw new Error(`Expected schema coordinate ${coordinate} to be ${kind}.`);
      }
      return childEntry as Extract<SchemaExplorerEntry, { kind: TKind }>;
    };
    const inputValue = (coordinate: string) => {
      const value = child(coordinate, Kind.INPUT_VALUE_DEFINITION);
      return {
        name: nameOf(coordinate),
        description: value.description,
        deprecationReason: value.deprecationReason,
        defaultValue: value.defaultValue,
        type: value.type,
      };
    };

    switch (entry.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION:
        return {
          kind: entry.kind,
          name: typename,
          description: entry.description,
          interfaces: entry.interfaces,
          fields: entry.fields.map((coordinate): GraphQLFieldMapper['entity'] => {
            const field = child(coordinate, Kind.FIELD_DEFINITION);
            return {
              name: nameOf(coordinate),
              description: field.description,
              deprecationReason: field.deprecationReason,
              type: field.type,
              args: field.args.map(inputValue),
            };
          }),
        };
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        return {
          kind: entry.kind,
          name: typename,
          description: entry.description,
          fields: entry.fields.map(inputValue),
        };
      case Kind.ENUM_TYPE_DEFINITION:
        return {
          kind: entry.kind,
          name: typename,
          description: entry.description,
          values: entry.values.map(coordinate => {
            const value = child(coordinate, Kind.ENUM_VALUE_DEFINITION);
            return {
              name: nameOf(coordinate),
              description: value.description,
              deprecationReason: value.deprecationReason,
            };
          }),
        };
      case Kind.UNION_TYPE_DEFINITION:
        return {
          kind: entry.kind,
          name: typename,
          description: entry.description,
          members: entry.members.map(name => ({ name })),
        };
      case Kind.SCALAR_TYPE_DEFINITION:
        return { kind: entry.kind, name: typename, description: entry.description };
      default:
        return null;
    }
  }

  /** The given types, assembled (unknown names are skipped). */
  getTypeEntities(typenames: ReadonlyArray<string>): Array<SchemaExplorerTypeEntity> {
    return typenames.flatMap(typename => this.getTypeEntity(typename) ?? []);
  }

  /**
   * A type whose `name` and `kind` come from the header. Everything else (description, fields,
   * interfaces, values, members) is decoded on first access, so listing types (e.g. names and
   * owners for the type filter) does not decode any of them.
   * Returns null if there is no such type.
   */
  getLazyTypeEntity(typename: string): SchemaExplorerTypeEntity | null {
    const index = this.typeIndex.get(typename);
    if (index === undefined) {
      return null;
    }
    const kind = this.header.types[index][1];
    const LazyTypeEntity = LAZY_TYPE_ENTITY_CLASSES[kind];
    return new LazyTypeEntity(kind, typename, () => {
      const entity = this.getTypeEntity(typename);
      if (!entity) {
        throw new Error(`Expected type ${typename} in the snapshot.`);
      }
      return entity;
    }) as unknown as SchemaExplorerTypeEntity;
  }

  /**
   * Names of the types (without built-in scalars) the unused explorer has to look at, read from the
   * coordinate index without decoding any type: object, interface and input object types with an
   * unused field, argument or input field, and enums, unions and scalars that are unused themselves.
   * Every other type is entirely used, so `onlyUnusedTypes` would remove it anyway.
   */
  getTypesWithUnusedCoordinates(usedCoordinates: ReadonlySet<string>): Array<string> {
    const [offset, length] = this.header.coordinateIndex;
    const start = this.dataOffset + offset;
    const lines = this.buffer.toString('utf8', start, start + length).split('\n');

    const result: Array<string> = [];
    this.header.types.forEach(([name, kind, , , , builtIn], index) => {
      if (builtIn === 1) {
        return;
      }
      if (
        kind === Kind.OBJECT_TYPE_DEFINITION ||
        kind === Kind.INTERFACE_TYPE_DEFINITION ||
        kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
      ) {
        const line = lines[index];
        if (line && line.split(' ').some(coordinate => !usedCoordinates.has(coordinate))) {
          result.push(name);
        }
      } else if (!usedCoordinates.has(name)) {
        result.push(name);
      }
    });
    return result;
  }
}
