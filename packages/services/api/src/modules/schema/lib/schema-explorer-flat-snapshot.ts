/**
 * The binary form of a schema explorer snapshot: a struct-of-arrays layout over one buffer.
 *
 * - Every entity kind (types, fields, input values, enum values) is a set of parallel typed-array
 *   columns; references between entities are integer indexes.
 * - Every string is stored once in a single UTF-8 blob and referenced by id.
 * - Type references like `[Product!]!` are stored as (type id, wrapping bits).
 * - Sets of owning subgraphs are stored once and referenced by id.
 * - A hash table from schema coordinate to entity is part of the buffer.
 *
 * The buffer is the in-memory form: opening it creates the typed-array views and decodes the
 * string blob, nothing else. It holds no JS objects per entity, so it adds nothing to garbage
 * collection, and entities are only materialized when a request reads them.
 *
 * Layout: bytes 0-2 "HSE", byte 3 the format version, bytes 4-7 unused, then the header words
 * (uint32) and the columns, each 8-byte aligned. Columns use the platform's byte order; a
 * buffer of another byte order fails the magic check and is rebuilt.
 */
import type { GraphQLFieldMapper } from '../module.graphql.mappers';
import { Kind } from 'graphql';
import { invariant } from '@hive/service-common';
import type {
  SchemaExplorerEntry,
  SchemaExplorerSnapshot,
  SchemaExplorerTypeEntity,
} from './schema-explorer-snapshot';

/** Bump when the layout or the meaning of a column changes, so stale snapshots are not read. */
export const SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION = 1;

const MAGIC = 'HSE';
const NONE = -1;
/** V8 string header plus array slot of a cached lazy string; measured at 28.5–29.3 bytes. */
const CACHED_LAZY_STRING_OVERHEAD_BYTES = 32;

type TypeKind = Extract<SchemaExplorerEntry['kind'], `${string}TypeDefinition`>;

/** The `typeKind` column stores an index into this list. */
const TYPE_KINDS = [
  Kind.SCALAR_TYPE_DEFINITION,
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
] as const satisfies ReadonlyArray<TypeKind>;
// 0 is a scalar
const TYPE_KIND_OBJECT = 1;
const TYPE_KIND_INTERFACE = 2;
const TYPE_KIND_UNION = 3;
const TYPE_KIND_ENUM = 4;
const TYPE_KIND_INPUT_OBJECT = 5;

/** Bits of the `typeFlags` column. */
const TYPE_FLAG_BUILT_IN = 1;
/** Bits of the `inputValueFlags` column. */
const INPUT_VALUE_FLAG_ARGUMENT = 1;

// A handle packs (entity kind, index) into one small integer: what a coordinate lookup returns.
const HANDLE_KIND_TYPE = 1;
const HANDLE_KIND_FIELD = 2;
const HANDLE_KIND_INPUT_VALUE = 3;
const HANDLE_KIND_ENUM_VALUE = 4;
/** Indexes are below this, so `kind * HANDLE_INDEX_RANGE + index` is unambiguous. */
const HANDLE_INDEX_RANGE = 2 ** 26;
const handleKind = (handle: number) => Math.floor(handle / HANDLE_INDEX_RANGE);
const handleIndex = (handle: number) => handle % HANDLE_INDEX_RANGE;
const makeHandle = (kind: number, index: number) => kind * HANDLE_INDEX_RANGE + index;

// ---------------------------------------------------------------------------------------------
// Layout

/** Only the order matters for the binary format; the names are not stored. */
const HEADER_WORDS = [
  'stringCount',
  'stringHashSlots',
  'coordinateHashSlots',
  'subgraphCount',
  'typeCount',
  'fieldCount',
  /** Arguments and input fields */
  'inputValueCount',
  'enumValueCount',
  /** Interfaces of object and interface types, and members of unions */
  'typeRefCount',
  'ownerSetCount',
  'ownerSetItemCount',
  'stringBlobBytes',
  'lazyStringCount',
  'lazyStringBlobBytes',
  'deprecatedTypeCount',
  /** Type ids of the root types, NONE if absent */
  'queryType',
  'mutationType',
  'subscriptionType',
] as const;
type Header = Record<(typeof HEADER_WORDS)[number], number>;
const HEADER_OFFSET = 8;
const HEADER_END = Math.ceil((HEADER_OFFSET + HEADER_WORDS.length * 4) / 8) * 8;

/** The header word holding the length of a column; `+1` columns hold one more element. */
type ColumnLength =
  | Exclude<keyof Header, 'queryType' | 'mutationType' | 'subscriptionType'>
  | 'stringCount+1'
  | 'lazyStringCount+1'
  | 'ownerSetCount+1';
type ArrayConstructor =
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Uint16ArrayConstructor
  | Uint8ArrayConstructor;

/**
 * Only the order matters for the binary format; the names are not stored.
 *
 * Name columns hold string ids. Description, deprecation reason and default value columns hold
 * lazy string ids (NONE if absent): these strings are only read, never looked up, so they are kept
 * out of the string blob and decoded one at a time on first read instead of on open. Owner set
 * columns hold owner set ids
 * (NONE if absent). `…Start` / `…Length` columns are ranges into the columns of another entity
 * kind.
 */
const COLUMNS = [
  // strings
  ['stringOffsets', Uint32Array, 'stringCount+1'], // UTF-16 offsets into the decoded blob
  ['stringHashTable', Int32Array, 'stringHashSlots'], // string id per slot
  ['typeIdByStringId', Int32Array, 'stringCount'],
  ['coordinateHashTable', Int32Array, 'coordinateHashSlots'], // handle per slot
  ['subgraphNames', Int32Array, 'subgraphCount'],
  // types (in name order)
  ['typeName', Int32Array, 'typeCount'],
  ['typeDescription', Int32Array, 'typeCount'],
  ['typeOwnerSet', Int32Array, 'typeCount'],
  ['typeChildrenStart', Uint32Array, 'typeCount'], // into fields, input values or enum values
  ['typeChildrenLength', Uint32Array, 'typeCount'],
  ['typeRefsStart', Uint32Array, 'typeCount'], // into typeRefs
  ['typeRefsLength', Uint32Array, 'typeCount'],
  ['typeKind', Uint8Array, 'typeCount'],
  ['typeFlags', Uint8Array, 'typeCount'],
  // fields of object and interface types
  ['fieldName', Int32Array, 'fieldCount'],
  ['fieldDescription', Int32Array, 'fieldCount'],
  ['fieldDeprecationReason', Int32Array, 'fieldCount'],
  ['fieldOwnerSet', Int32Array, 'fieldCount'],
  ['fieldType', Uint32Array, 'fieldCount'],
  ['fieldArgsStart', Uint32Array, 'fieldCount'], // into input values
  ['fieldArgsLength', Uint32Array, 'fieldCount'],
  ['fieldParentType', Uint32Array, 'fieldCount'],
  ['fieldTypeWrapping', Uint16Array, 'fieldCount'],
  // input values: arguments (parent is a field) and input fields (parent is a type)
  ['inputValueName', Int32Array, 'inputValueCount'],
  ['inputValueDescription', Int32Array, 'inputValueCount'],
  ['inputValueDefaultValue', Int32Array, 'inputValueCount'], // JSON
  ['inputValueDeprecationReason', Int32Array, 'inputValueCount'],
  ['inputValueOwnerSet', Int32Array, 'inputValueCount'],
  ['inputValueType', Uint32Array, 'inputValueCount'],
  ['inputValueParent', Uint32Array, 'inputValueCount'],
  ['inputValueTypeWrapping', Uint16Array, 'inputValueCount'],
  ['inputValueFlags', Uint8Array, 'inputValueCount'],
  // enum values
  ['enumValueName', Int32Array, 'enumValueCount'],
  ['enumValueDescription', Int32Array, 'enumValueCount'],
  ['enumValueDeprecationReason', Int32Array, 'enumValueCount'],
  ['enumValueOwnerSet', Int32Array, 'enumValueCount'],
  ['enumValueParentType', Uint32Array, 'enumValueCount'],
  // misc
  ['typeRefs', Uint32Array, 'typeRefCount'], // type ids
  ['ownerSetStart', Uint32Array, 'ownerSetCount+1'], // into ownerSetSubgraphs
  ['ownerSetSubgraphs', Uint16Array, 'ownerSetItemCount'], // indexes into subgraphNames
  ['deprecatedTypes', Uint32Array, 'deprecatedTypeCount'], // type ids
  ['stringBlob', Uint8Array, 'stringBlobBytes'],
  ['lazyStringOffsets', Uint32Array, 'lazyStringCount+1'], // UTF-8 byte offsets into lazyStringBlob
  ['lazyStringBlob', Uint8Array, 'lazyStringBlobBytes'],
] as const satisfies ReadonlyArray<readonly [string, ArrayConstructor, ColumnLength]>;

type ColumnName = (typeof COLUMNS)[number][0];
type Columns = {
  [N in ColumnName]: InstanceType<Extract<(typeof COLUMNS)[number], readonly [N, any, any]>[1]>;
};

function columnLength(header: Header, length: ColumnLength) {
  switch (length) {
    case 'stringCount+1':
      return header.stringCount + 1;
    case 'lazyStringCount+1':
      return header.lazyStringCount + 1;
    case 'ownerSetCount+1':
      return header.ownerSetCount + 1;
    default:
      return header[length];
  }
}

function layout(header: Header) {
  let offset = HEADER_END;
  const offsets: Array<number> = [];
  for (const [, ArrayType, length] of COLUMNS) {
    offsets.push(offset);
    offset += columnLength(header, length) * ArrayType.BYTES_PER_ELEMENT;
    offset = (offset + 7) & ~7;
  }
  return { offsets, total: offset };
}

/** FNV-1a over UTF-16 code units of `value[start, end)`. */
function fnv1a(value: string, start: number, end: number) {
  let hash = 0x811c9dc5;
  for (let index = start; index < end; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

/** Smallest power of two (at least 16) with at least twice as many slots as entries. */
function hashTableSlots(entries: number) {
  let slots = 16;
  while (slots < entries * 2) {
    slots <<= 1;
  }
  return slots;
}

/**
 * Open addressing with linear probing over an Int32Array whose length is a power of two.
 * NONE marks an empty slot.
 */
function hashTableInsert(table: Int32Array, hash: number, value: number) {
  const slotMask = table.length - 1;
  let slot = hash & slotMask;
  while (table[slot] !== NONE) {
    slot = (slot + 1) & slotMask;
  }
  table[slot] = value;
}

/** The first value in the probe sequence of `hash` for which `matches` is true, or NONE. */
function hashTableFind(
  table: Int32Array,
  hash: number,
  matches: (value: number) => boolean,
): number {
  const slotMask = table.length - 1;
  for (let slot = hash & slotMask; ; slot = (slot + 1) & slotMask) {
    const value = table[slot];
    if (value === NONE || matches(value)) {
      return value;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Strings

/** Stores each distinct string once and hands out ids in insertion order. */
class StringInterner {
  readonly values: Array<string> = [];
  #ids = new Map<string, number>();

  /** Id of a string, adding it if needed; NONE for null or undefined. */
  intern(value: string | null | undefined): number {
    if (value == null) {
      return NONE;
    }
    // The GraphQL parser rejects lone surrogates; should one appear anyway, replace it rather
    // than failing, as UTF-8 cannot represent it.
    const wellFormed = value.isWellFormed() ? value : value.toWellFormed();
    let id = this.#ids.get(wellFormed);
    if (id === undefined) {
      id = this.values.length;
      this.values.push(wellFormed);
      this.#ids.set(wellFormed, id);
    }
    return id;
  }
}

/**
 * Lazy strings: descriptions, deprecation reasons and default values. They are only read, never
 * looked up, so they are stored apart from the names and decoded one at a time on first read.
 */
class LazyStringEncoder extends StringInterner {
  /** One UTF-8 blob; lazy string `id` is bytes `[offsets[id], offsets[id + 1])` of it. */
  encode(): { offsets: Uint32Array; blob: Uint8Array } {
    const blob = new TextEncoder().encode(this.values.join(''));
    const offsets = new Uint32Array(this.values.length + 1);
    for (let id = 0, offset = 0; id < this.values.length; id++) {
      offset += Buffer.byteLength(this.values[id], 'utf8');
      offsets[id + 1] = offset;
    }
    return { offsets, blob };
  }
}

class LazyStringDecoder {
  #bytes: Buffer;
  #decoded: Array<string | undefined>;

  constructor(
    private offsets: Uint32Array,
    blob: Uint8Array,
  ) {
    this.#bytes = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
    this.#decoded = new Array(offsets.length - 1);
  }

  /**
   * The lazy string, or undefined for NONE. Decoded on its first read and kept: decoding costs
   * about 70 ns, a cached read about 5 ns, and only the strings requests read are ever decoded.
   */
  get(id: number): string | undefined {
    if (id === NONE) {
      return undefined;
    }
    return (this.#decoded[id] ??= this.#bytes.toString(
      'utf8',
      this.offsets[id],
      this.offsets[id + 1],
    ));
  }
}

// ---------------------------------------------------------------------------------------------
// Owner sets: lists of owning subgraphs, each stored once and referenced by id.

class OwnerSetEncoder {
  /** Offsets into `subgraphs`; set `id` is `subgraphs[start[id], start[id + 1])`. */
  readonly start: Array<number> = [0];
  /** Indexes into the subgraph names. */
  readonly subgraphs: Array<number> = [];
  #ids = new Map<string, number>();
  #subgraphIndexes: Map<string, number>;

  constructor(subgraphNames: ReadonlyArray<string>) {
    this.#subgraphIndexes = new Map(subgraphNames.map((name, index) => [name, index]));
  }

  get count() {
    return this.start.length - 1;
  }

  /** Id of a list of owning subgraphs (keeping its order), adding it if needed; NONE if absent. */
  intern(serviceNames: ReadonlyArray<string> | undefined): number {
    if (!serviceNames) {
      return NONE;
    }
    const indexes = serviceNames.map(name => {
      const index = this.#subgraphIndexes.get(name);
      invariant(index !== undefined, () => `Subgraph ${name} is missing from the subgraph names.`);
      return index;
    });
    const key = indexes.join(',');
    let id = this.#ids.get(key);
    if (id === undefined) {
      id = this.count;
      this.subgraphs.push(...indexes);
      this.start.push(this.subgraphs.length);
      this.#ids.set(key, id);
    }
    return id;
  }
}

class OwnerSetDecoder {
  #names: Array<Array<string> | undefined>;

  constructor(
    private start: Uint32Array,
    private subgraphs: Uint16Array,
    private subgraphNames: ReadonlyArray<string>,
  ) {
    this.#names = new Array(start.length - 1);
  }

  /** The subgraph names of a set (decoded once), or null for NONE. */
  get(ownerSet: number): Array<string> | null {
    if (ownerSet === NONE) {
      return null;
    }
    let names = this.#names[ownerSet];
    if (!names) {
      names = [];
      for (let item = this.start[ownerSet]; item < this.start[ownerSet + 1]; item++) {
        names.push(this.subgraphNames[this.subgraphs[item]]);
      }
      this.#names[ownerSet] = names;
    }
    return names;
  }
}

// ---------------------------------------------------------------------------------------------
// Type references

const CHAR_OPEN_BRACKET = 91; // [
const CHAR_CLOSE_BRACKET = 93; // ]
const CHAR_EXCLAMATION = 33; // !
const CHAR_DOT = 46; // .

/**
 * `[[Foo!]!]` → `{ name: 'Foo', wrapping }`.
 * wrapping = list depth (3 bits) | non-null mask << 3, where bit `level` of the non-null mask is
 * set if the type at that list depth is non-null (bit 0 is the outermost type).
 */
function parseTypeRef(type: string) {
  let position = 0;
  let listDepth = 0;
  while (type.charCodeAt(position) === CHAR_OPEN_BRACKET) {
    listDepth++;
    position++;
  }
  const nameStart = position;
  while (
    position < type.length &&
    type.charCodeAt(position) !== CHAR_EXCLAMATION &&
    type.charCodeAt(position) !== CHAR_CLOSE_BRACKET
  ) {
    position++;
  }
  const name = type.slice(nameStart, position);
  let level = listDepth;
  let nonNullMask = 0;
  if (type.charCodeAt(position) === CHAR_EXCLAMATION) {
    nonNullMask |= 1 << level;
    position++;
  }
  while (position < type.length) {
    if (type.charCodeAt(position) === CHAR_CLOSE_BRACKET) {
      level--;
      position++;
    }
    if (type.charCodeAt(position) === CHAR_EXCLAMATION) {
      nonNullMask |= 1 << level;
      position++;
    }
  }
  invariant(listDepth <= 7, () => `Type ${type} is nested in too many lists.`);
  return { name, wrapping: listDepth | (nonNullMask << 3) };
}

function formatTypeRef(name: string, wrapping: number) {
  const listDepth = wrapping & 7;
  const nonNullMask = wrapping >> 3;
  let out = '['.repeat(listDepth) + name;
  if (nonNullMask & (1 << listDepth)) {
    out += '!';
  }
  for (let level = listDepth - 1; level >= 0; level--) {
    out += ']';
    if (nonNullMask & (1 << level)) {
      out += '!';
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Encoding

/** The last segment of a schema coordinate, e.g. `id` for `Query.user.id`. */
function nameOf(coordinate: string) {
  return coordinate.slice(coordinate.lastIndexOf('.') + 1);
}

export function encodeSchemaExplorerSnapshot(snapshot: SchemaExplorerSnapshot): Buffer {
  const strings = new StringInterner();
  const lazyStrings = new LazyStringEncoder();
  const subgraphNames = snapshot.subgraphNames.map(name => strings.intern(name));
  const ownerSets = new OwnerSetEncoder(snapshot.subgraphNames);

  const typeIds = new Map(snapshot.types.map((name, index) => [name, index]));
  const typeIdOf = (name: string) => {
    const id = typeIds.get(name);
    invariant(id !== undefined, () => `Type ${name} is missing from the snapshot.`);
    return id;
  };
  const entryOf = <TKind extends SchemaExplorerEntry['kind']>(coordinate: string, kind: TKind) => {
    const entry = snapshot.coordinates[coordinate];
    invariant(
      entry?.kind === kind,
      () => `Expected schema coordinate ${coordinate} to be ${kind}.`,
    );
    return entry as Extract<SchemaExplorerEntry, { kind: TKind }>;
  };

  const typeCount = snapshot.types.length;
  const types = {
    name: new Int32Array(typeCount),
    description: new Int32Array(typeCount),
    ownerSet: new Int32Array(typeCount),
    childrenStart: new Uint32Array(typeCount),
    childrenLength: new Uint32Array(typeCount),
    refsStart: new Uint32Array(typeCount),
    refsLength: new Uint32Array(typeCount),
    kind: new Uint8Array(typeCount),
    flags: new Uint8Array(typeCount),
  };
  const fields = {
    name: [] as Array<number>,
    description: [] as Array<number>,
    deprecationReason: [] as Array<number>,
    ownerSet: [] as Array<number>,
    type: [] as Array<number>,
    argsStart: [] as Array<number>,
    argsLength: [] as Array<number>,
    parentType: [] as Array<number>,
    typeWrapping: [] as Array<number>,
    argCoordinates: [] as Array<ReadonlyArray<string>>,
  };
  const inputValues = {
    name: [] as Array<number>,
    description: [] as Array<number>,
    defaultValue: [] as Array<number>,
    deprecationReason: [] as Array<number>,
    ownerSet: [] as Array<number>,
    type: [] as Array<number>,
    parent: [] as Array<number>,
    typeWrapping: [] as Array<number>,
    flags: [] as Array<number>,
  };
  const enumValues = {
    name: [] as Array<number>,
    description: [] as Array<number>,
    deprecationReason: [] as Array<number>,
    ownerSet: [] as Array<number>,
    parentType: [] as Array<number>,
  };
  const typeRefs: Array<number> = [];

  const addInputValue = (coordinate: string, parent: number, isArgument: boolean) => {
    const value = entryOf(coordinate, Kind.INPUT_VALUE_DEFINITION);
    const typeRef = parseTypeRef(value.type);
    inputValues.name.push(strings.intern(nameOf(coordinate)));
    inputValues.description.push(lazyStrings.intern(value.description));
    inputValues.defaultValue.push(
      value.defaultValue === undefined
        ? NONE
        : lazyStrings.intern(JSON.stringify(value.defaultValue)),
    );
    inputValues.deprecationReason.push(lazyStrings.intern(value.deprecationReason));
    inputValues.ownerSet.push(ownerSets.intern(value.ownedBy));
    inputValues.type.push(typeIdOf(typeRef.name));
    inputValues.typeWrapping.push(typeRef.wrapping);
    inputValues.parent.push(parent);
    inputValues.flags.push(isArgument ? INPUT_VALUE_FLAG_ARGUMENT : 0);
  };

  // Pass 1: types and their direct children. Arguments are added afterwards, so the arguments of
  // a field and the children of a type are contiguous ranges.
  snapshot.types.forEach((typename, type) => {
    const entry = snapshot.coordinates[typename];
    invariant(entry, () => `Type ${typename} is missing from the snapshot.`);
    const kind = TYPE_KINDS.indexOf(entry.kind as TypeKind);
    invariant(kind !== -1, () => `Expected schema coordinate ${typename} to be a type.`);
    types.name[type] = strings.intern(typename);
    types.description[type] = lazyStrings.intern(entry.description);
    types.ownerSet[type] = ownerSets.intern(entry.ownedBy);
    types.kind[type] = kind;
    types.refsStart[type] = typeRefs.length;

    switch (entry.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION:
        entry.interfaces.forEach(name => typeRefs.push(typeIdOf(name)));
        types.childrenStart[type] = fields.name.length;
        types.childrenLength[type] = entry.fields.length;
        for (const coordinate of entry.fields) {
          const field = entryOf(coordinate, Kind.FIELD_DEFINITION);
          const typeRef = parseTypeRef(field.type);
          fields.name.push(strings.intern(nameOf(coordinate)));
          fields.description.push(lazyStrings.intern(field.description));
          fields.deprecationReason.push(lazyStrings.intern(field.deprecationReason));
          fields.ownerSet.push(ownerSets.intern(field.ownedBy));
          fields.type.push(typeIdOf(typeRef.name));
          fields.typeWrapping.push(typeRef.wrapping);
          fields.parentType.push(type);
          fields.argsStart.push(0);
          fields.argsLength.push(field.args.length);
          fields.argCoordinates.push(field.args);
        }
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        types.childrenStart[type] = inputValues.name.length;
        types.childrenLength[type] = entry.fields.length;
        entry.fields.forEach(coordinate => addInputValue(coordinate, type, false));
        break;
      case Kind.ENUM_TYPE_DEFINITION:
        types.childrenStart[type] = enumValues.name.length;
        types.childrenLength[type] = entry.values.length;
        for (const coordinate of entry.values) {
          const value = entryOf(coordinate, Kind.ENUM_VALUE_DEFINITION);
          enumValues.name.push(strings.intern(nameOf(coordinate)));
          enumValues.description.push(lazyStrings.intern(value.description));
          enumValues.deprecationReason.push(lazyStrings.intern(value.deprecationReason));
          enumValues.ownerSet.push(ownerSets.intern(value.ownedBy));
          enumValues.parentType.push(type);
        }
        break;
      case Kind.UNION_TYPE_DEFINITION:
        entry.members.forEach(name => typeRefs.push(typeIdOf(name)));
        break;
      case Kind.SCALAR_TYPE_DEFINITION:
        types.flags[type] = entry.builtIn ? TYPE_FLAG_BUILT_IN : 0;
        break;
    }
    types.refsLength[type] = typeRefs.length - types.refsStart[type];
  });

  // Pass 2: arguments.
  fields.argCoordinates.forEach((argCoordinates, field) => {
    fields.argsStart[field] = inputValues.name.length;
    argCoordinates.forEach(coordinate => addInputValue(coordinate, field, true));
  });

  const { offsets: lazyStringOffsets, blob: lazyStringBlob } = lazyStrings.encode();

  // Strings: one blob, a hash table from string to id, and type ids by name string.
  const stringBlob = new TextEncoder().encode(strings.values.join(''));
  const stringOffsets = new Uint32Array(strings.values.length + 1);
  for (let id = 0, offset = 0; id < strings.values.length; id++) {
    stringOffsets[id] = offset;
    offset += strings.values[id].length;
    stringOffsets[id + 1] = offset;
  }
  const stringHashTable = new Int32Array(hashTableSlots(strings.values.length)).fill(NONE);
  strings.values.forEach((value, id) => {
    hashTableInsert(stringHashTable, fnv1a(value, 0, value.length), id);
  });
  const typeIdByStringId = new Int32Array(strings.values.length).fill(NONE);
  for (let type = 0; type < typeCount; type++) {
    typeIdByStringId[types.name[type]] = type;
  }

  // Schema coordinate → handle. Coordinates are only built here; they are not stored.
  const coordinateHashTable = new Int32Array(
    hashTableSlots(
      typeCount + fields.name.length + inputValues.name.length + enumValues.name.length,
    ),
  ).fill(NONE);
  const putCoordinate = (coordinate: string, handle: number) => {
    hashTableInsert(coordinateHashTable, fnv1a(coordinate, 0, coordinate.length), handle);
  };
  const typeNameOf = (type: number) => strings.values[types.name[type]];
  const fieldCoordinate = (field: number) =>
    `${typeNameOf(fields.parentType[field])}.${strings.values[fields.name[field]]}`;
  for (let type = 0; type < typeCount; type++) {
    putCoordinate(typeNameOf(type), makeHandle(HANDLE_KIND_TYPE, type));
  }
  for (let field = 0; field < fields.name.length; field++) {
    putCoordinate(fieldCoordinate(field), makeHandle(HANDLE_KIND_FIELD, field));
  }
  for (let inputValue = 0; inputValue < inputValues.name.length; inputValue++) {
    const parent = inputValues.parent[inputValue];
    const parentCoordinate =
      inputValues.flags[inputValue] & INPUT_VALUE_FLAG_ARGUMENT
        ? fieldCoordinate(parent)
        : typeNameOf(parent);
    putCoordinate(
      `${parentCoordinate}.${strings.values[inputValues.name[inputValue]]}`,
      makeHandle(HANDLE_KIND_INPUT_VALUE, inputValue),
    );
  }
  for (let enumValue = 0; enumValue < enumValues.name.length; enumValue++) {
    const enumName = typeNameOf(enumValues.parentType[enumValue]);
    putCoordinate(
      `${enumName}.${strings.values[enumValues.name[enumValue]]}`,
      makeHandle(HANDLE_KIND_ENUM_VALUE, enumValue),
    );
  }

  const rootTypeId = (name: string | null) => (name === null ? NONE : typeIdOf(name));
  const header: Header = {
    stringCount: strings.values.length,
    stringHashSlots: stringHashTable.length,
    coordinateHashSlots: coordinateHashTable.length,
    subgraphCount: subgraphNames.length,
    typeCount,
    fieldCount: fields.name.length,
    inputValueCount: inputValues.name.length,
    enumValueCount: enumValues.name.length,
    typeRefCount: typeRefs.length,
    ownerSetCount: ownerSets.count,
    ownerSetItemCount: ownerSets.subgraphs.length,
    stringBlobBytes: stringBlob.length,
    lazyStringCount: lazyStrings.values.length,
    lazyStringBlobBytes: lazyStringBlob.length,
    deprecatedTypeCount: snapshot.deprecatedTypes.length,
    queryType: rootTypeId(snapshot.queryTypeName),
    mutationType: rootTypeId(snapshot.mutationTypeName),
    subscriptionType: rootTypeId(snapshot.subscriptionTypeName),
  };
  const data: Record<ColumnName, ArrayLike<number>> = {
    stringOffsets,
    stringHashTable,
    typeIdByStringId,
    coordinateHashTable,
    subgraphNames,
    typeName: types.name,
    typeDescription: types.description,
    typeOwnerSet: types.ownerSet,
    typeChildrenStart: types.childrenStart,
    typeChildrenLength: types.childrenLength,
    typeRefsStart: types.refsStart,
    typeRefsLength: types.refsLength,
    typeKind: types.kind,
    typeFlags: types.flags,
    fieldName: fields.name,
    fieldDescription: fields.description,
    fieldDeprecationReason: fields.deprecationReason,
    fieldOwnerSet: fields.ownerSet,
    fieldType: fields.type,
    fieldArgsStart: fields.argsStart,
    fieldArgsLength: fields.argsLength,
    fieldParentType: fields.parentType,
    fieldTypeWrapping: fields.typeWrapping,
    inputValueName: inputValues.name,
    inputValueDescription: inputValues.description,
    inputValueDefaultValue: inputValues.defaultValue,
    inputValueDeprecationReason: inputValues.deprecationReason,
    inputValueOwnerSet: inputValues.ownerSet,
    inputValueType: inputValues.type,
    inputValueParent: inputValues.parent,
    inputValueTypeWrapping: inputValues.typeWrapping,
    inputValueFlags: inputValues.flags,
    enumValueName: enumValues.name,
    enumValueDescription: enumValues.description,
    enumValueDeprecationReason: enumValues.deprecationReason,
    enumValueOwnerSet: enumValues.ownerSet,
    enumValueParentType: enumValues.parentType,
    typeRefs,
    ownerSetStart: ownerSets.start,
    ownerSetSubgraphs: ownerSets.subgraphs,
    deprecatedTypes: snapshot.deprecatedTypes.map(typeIdOf),
    stringBlob,
    lazyStringOffsets,
    lazyStringBlob,
  };

  const { offsets, total } = layout(header);
  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < MAGIC.length; index++) {
    bytes[index] = MAGIC.charCodeAt(index);
  }
  bytes[3] = SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION;
  const words = new Uint32Array(buffer, HEADER_OFFSET, HEADER_WORDS.length);
  HEADER_WORDS.forEach((key, index) => {
    words[index] = header[key] >>> 0;
  });
  COLUMNS.forEach(([name, ArrayType, length], index) => {
    new ArrayType(buffer, offsets[index], columnLength(header, length)).set(data[name]);
  });
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------------------------
// Lazy type entities

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
 * One class per kind, with a getter per property on the prototype that materializes the type on
 * first access. Creating an instance only sets `kind` and `name`, which keeps listing thousands of
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

// ---------------------------------------------------------------------------------------------
// Reading

/**
 * Reads a binary snapshot in place. Opening only creates typed-array views and decodes the string
 * blob; entities are materialized when they are read.
 */
export class SchemaExplorerSnapshotReader {
  private cachedLazyStrings: LazyStringDecoder | null = null;
  private cachedOwnerSets: OwnerSetDecoder | null = null;
  private cachedSubgraphNames: Array<string> | null = null;
  private cachedDeprecatedTypes: Array<string> | null = null;

  private constructor(
    private buffer: Buffer,
    private columns: Columns,
    private header: Header,
    /** The decoded string blob; string `id` is `[stringOffsets[id], stringOffsets[id + 1])`. */
    private text: string,
  ) {}

  /** Returns null if the buffer is not a valid snapshot of the current format. */
  static fromBuffer(input: Buffer): SchemaExplorerSnapshotReader | null {
    if (
      input.length < HEADER_END ||
      input.toString('latin1', 0, MAGIC.length) !== MAGIC ||
      input[3] !== SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION
    ) {
      return null;
    }
    // Typed-array views need aligned offsets. Buffers from Redis or Node's buffer pool usually
    // start at an arbitrary offset of their memory, so copy them once.
    let buffer = input;
    if (buffer.byteOffset % 8 !== 0) {
      const copy = new Uint8Array(input.length);
      copy.set(input);
      buffer = Buffer.from(copy.buffer);
    }

    try {
      const base = buffer.byteOffset;
      // Snapshots are never backed by a SharedArrayBuffer.
      const arrayBuffer = buffer.buffer as ArrayBuffer;
      const words = new Uint32Array(arrayBuffer, base + HEADER_OFFSET, HEADER_WORDS.length);
      const header = {} as Header;
      HEADER_WORDS.forEach((key, index) => {
        header[key] = words[index];
      });
      // Root type ids are signed: NONE is stored as 0xffffffff.
      header.queryType |= 0;
      header.mutationType |= 0;
      header.subscriptionType |= 0;

      const { offsets, total } = layout(header);
      if (total > buffer.length) {
        return null;
      }
      const views: Record<string, unknown> = {};
      COLUMNS.forEach(([name, ArrayType, length], index) => {
        views[name] = new ArrayType(
          arrayBuffer,
          base + offsets[index],
          columnLength(header, length),
        );
      });
      const columns = views as Columns;
      // Keep a leading U+FEFF: by default TextDecoder strips it as a byte order mark, which would
      // shift every string offset when the first string starts with it.
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(columns.stringBlob);
      if (
        text.length !== columns.stringOffsets[header.stringCount] ||
        columns.lazyStringOffsets[header.lazyStringCount] !== header.lazyStringBlobBytes
      ) {
        return null;
      }
      return new SchemaExplorerSnapshotReader(buffer, columns, header, text);
    } catch {
      return null;
    }
  }

  static fromSnapshot(snapshot: SchemaExplorerSnapshot) {
    const reader = SchemaExplorerSnapshotReader.fromBuffer(encodeSchemaExplorerSnapshot(snapshot));
    invariant(reader, 'Failed to read the encoded schema explorer snapshot.');
    return reader;
  }

  /** Size of the binary snapshot in bytes. */
  get byteLength() {
    return this.buffer.length;
  }

  /**
   * Memory this reader holds once all of its lazy strings have been read: the buffer, the decoded
   * names (one byte per character; only subgraph names can be non-ASCII) and the cached lazy
   * strings.
   * Used to size the in-memory cache, so it errs on the side of a reader that has served many
   * requests.
   */
  get estimatedMemoryBytes() {
    const { stringBlobBytes, lazyStringBlobBytes, lazyStringCount } = this.header;
    return (
      this.buffer.length +
      stringBlobBytes +
      lazyStringBlobBytes +
      lazyStringCount * CACHED_LAZY_STRING_OVERHEAD_BYTES
    );
  }

  /** The binary snapshot, e.g. for storing it. */
  toBuffer() {
    return this.buffer;
  }

  // ------------------------------------------------------------------------------- strings

  private string(id: number): string {
    return this.text.substring(this.columns.stringOffsets[id], this.columns.stringOffsets[id + 1]);
  }

  private get lazyStrings(): LazyStringDecoder {
    this.cachedLazyStrings ??= new LazyStringDecoder(
      this.columns.lazyStringOffsets,
      this.columns.lazyStringBlob,
    );
    return this.cachedLazyStrings;
  }

  /** Id of `value[start, end)` without allocating it, or NONE. */
  private findStringId(value: string, start = 0, end = value.length): number {
    const { stringHashTable, stringOffsets } = this.columns;
    const length = end - start;
    return hashTableFind(stringHashTable, fnv1a(value, start, end), id => {
      const offset = stringOffsets[id];
      if (stringOffsets[id + 1] - offset !== length) {
        return false;
      }
      for (let index = 0; index < length; index++) {
        if (this.text.charCodeAt(offset + index) !== value.charCodeAt(start + index)) {
          return false;
        }
      }
      return true;
    });
  }

  private findTypeId(name: string): number {
    const id = this.findStringId(name);
    return id === NONE ? NONE : this.columns.typeIdByStringId[id];
  }

  private typeNameOf(type: number) {
    return this.string(this.columns.typeName[type]);
  }

  // ------------------------------------------------------------------- coordinate lookup

  /**
   * Position after string `stringId` if `coordinate` continues with it at `position`, otherwise -1.
   */
  private matchSegment(coordinate: string, position: number, stringId: number): number {
    const offset = this.columns.stringOffsets[stringId];
    const length = this.columns.stringOffsets[stringId + 1] - offset;
    if (position + length > coordinate.length) {
      return -1;
    }
    for (let index = 0; index < length; index++) {
      if (this.text.charCodeAt(offset + index) !== coordinate.charCodeAt(position + index)) {
        return -1;
      }
    }
    return position + length;
  }

  private coordinateEquals(coordinate: string, handle: number): boolean {
    const columns = this.columns;
    const index = handleIndex(handle);
    // The coordinate of the handle is `type.member` or `type.member.argument` (string ids).
    let type: number;
    let member: number;
    let argument = NONE;
    switch (handleKind(handle)) {
      case HANDLE_KIND_TYPE:
        return this.matchSegment(coordinate, 0, columns.typeName[index]) === coordinate.length;
      case HANDLE_KIND_FIELD:
        type = columns.fieldParentType[index];
        member = columns.fieldName[index];
        break;
      case HANDLE_KIND_ENUM_VALUE:
        type = columns.enumValueParentType[index];
        member = columns.enumValueName[index];
        break;
      default:
        if (columns.inputValueFlags[index] & INPUT_VALUE_FLAG_ARGUMENT) {
          const field = columns.inputValueParent[index];
          type = columns.fieldParentType[field];
          member = columns.fieldName[field];
          argument = columns.inputValueName[index];
        } else {
          type = columns.inputValueParent[index];
          member = columns.inputValueName[index];
        }
    }
    let position = this.matchSegment(coordinate, 0, columns.typeName[type]);
    if (position < 0 || coordinate.charCodeAt(position) !== CHAR_DOT) {
      return false;
    }
    position = this.matchSegment(coordinate, position + 1, member);
    if (argument === NONE) {
      return position === coordinate.length;
    }
    if (position < 0 || coordinate.charCodeAt(position) !== CHAR_DOT) {
      return false;
    }
    return this.matchSegment(coordinate, position + 1, argument) === coordinate.length;
  }

  /** `Type`, `Type.field`, `Type.field.argument`, `Input.field` or `Enum.VALUE` → handle or NONE. */
  private lookup(coordinate: string): number {
    return hashTableFind(
      this.columns.coordinateHashTable,
      fnv1a(coordinate, 0, coordinate.length),
      handle => this.coordinateEquals(coordinate, handle),
    );
  }

  private ownerSet(ownerSet: number): Array<string> | null {
    this.cachedOwnerSets ??= new OwnerSetDecoder(
      this.columns.ownerSetStart,
      this.columns.ownerSetSubgraphs,
      this.subgraphNames,
    );
    return this.cachedOwnerSets.get(ownerSet);
  }

  private ownerSetOf(handle: number) {
    const index = handleIndex(handle);
    switch (handleKind(handle)) {
      case HANDLE_KIND_TYPE:
        return this.columns.typeOwnerSet[index];
      case HANDLE_KIND_FIELD:
        return this.columns.fieldOwnerSet[index];
      case HANDLE_KIND_INPUT_VALUE:
        return this.columns.inputValueOwnerSet[index];
      default:
        return this.columns.enumValueOwnerSet[index];
    }
  }

  // --------------------------------------------------------------------------- public API

  get queryTypeName() {
    return this.header.queryType === NONE ? null : this.typeNameOf(this.header.queryType);
  }
  get mutationTypeName() {
    return this.header.mutationType === NONE ? null : this.typeNameOf(this.header.mutationType);
  }
  get subscriptionTypeName() {
    return this.header.subscriptionType === NONE
      ? null
      : this.typeNameOf(this.header.subscriptionType);
  }
  /** All subgraphs owning a part of the supergraph, sorted by name. */
  get subgraphNames(): Array<string> {
    this.cachedSubgraphNames ??= Array.from(this.columns.subgraphNames, id => this.string(id));
    return this.cachedSubgraphNames;
  }
  /**
   * Types with a deprecated field, argument, enum value or input field, sorted by name.
   * The deprecated explorer only needs to look at these.
   */
  get deprecatedTypes(): Array<string> {
    this.cachedDeprecatedTypes ??= Array.from(this.columns.deprecatedTypes, type =>
      this.typeNameOf(type),
    );
    return this.cachedDeprecatedTypes;
  }

  /** All type names, sorted by name. */
  getTypeNames({ withBuiltInScalars }: { withBuiltInScalars: boolean }): Array<string> {
    const names: Array<string> = [];
    for (let type = 0; type < this.header.typeCount; type++) {
      if (withBuiltInScalars || !(this.columns.typeFlags[type] & TYPE_FLAG_BUILT_IN)) {
        names.push(this.typeNameOf(type));
      }
    }
    return names;
  }

  /** The subgraphs owning a schema coordinate, or null. */
  getOwnedBy(coordinate: string): Array<string> | null {
    const handle = this.lookup(coordinate);
    return handle === NONE ? null : this.ownerSet(this.ownerSetOf(handle));
  }

  /** The entry of a schema coordinate, in the shape `buildSchemaExplorerSnapshot` produces. */
  getEntry(coordinate: string): SchemaExplorerEntry | null {
    const handle = this.lookup(coordinate);
    if (handle === NONE) {
      return null;
    }
    const columns = this.columns;
    const index = handleIndex(handle);
    const ownedBy = this.ownerSet(this.ownerSetOf(handle));
    const withOwners = (entry: SchemaExplorerEntry): SchemaExplorerEntry =>
      ownedBy ? { ...entry, ownedBy } : entry;

    switch (handleKind(handle)) {
      case HANDLE_KIND_FIELD: {
        const field = index;
        const args: Array<string> = [];
        for (
          let argument = columns.fieldArgsStart[field],
            argsEnd = argument + columns.fieldArgsLength[field];
          argument < argsEnd;
          argument++
        ) {
          args.push(`${coordinate}.${this.string(columns.inputValueName[argument])}`);
        }
        return withOwners({
          kind: Kind.FIELD_DEFINITION,
          description: this.lazyStrings.get(columns.fieldDescription[field]),
          deprecationReason: this.lazyStrings.get(columns.fieldDeprecationReason[field]),
          type: formatTypeRef(
            this.typeNameOf(columns.fieldType[field]),
            columns.fieldTypeWrapping[field],
          ),
          args,
        });
      }
      case HANDLE_KIND_INPUT_VALUE: {
        const inputValue = this.inputValue(index);
        return withOwners({
          kind: Kind.INPUT_VALUE_DEFINITION,
          description: inputValue.description,
          deprecationReason: inputValue.deprecationReason,
          type: inputValue.type,
          ...(columns.inputValueDefaultValue[index] === NONE
            ? {}
            : { defaultValue: inputValue.defaultValue }),
        });
      }
      case HANDLE_KIND_ENUM_VALUE: {
        const enumValue = index;
        return withOwners({
          kind: Kind.ENUM_VALUE_DEFINITION,
          description: this.lazyStrings.get(columns.enumValueDescription[enumValue]),
          deprecationReason: this.lazyStrings.get(columns.enumValueDeprecationReason[enumValue]),
        });
      }
    }

    const type = index;
    const typename = coordinate;
    const description = this.lazyStrings.get(columns.typeDescription[type]);
    const childrenStart = columns.typeChildrenStart[type];
    const childrenEnd = childrenStart + columns.typeChildrenLength[type];
    const childCoordinates = (childNames: Int32Array) => {
      const coordinates: Array<string> = [];
      for (let child = childrenStart; child < childrenEnd; child++) {
        coordinates.push(`${typename}.${this.string(childNames[child])}`);
      }
      return coordinates;
    };
    switch (columns.typeKind[type]) {
      case TYPE_KIND_OBJECT:
      case TYPE_KIND_INTERFACE:
        return withOwners({
          kind: TYPE_KINDS[columns.typeKind[type]] as
            | typeof Kind.OBJECT_TYPE_DEFINITION
            | typeof Kind.INTERFACE_TYPE_DEFINITION,
          description,
          interfaces: this.typeRefNames(type),
          fields: childCoordinates(columns.fieldName),
        });
      case TYPE_KIND_INPUT_OBJECT:
        return withOwners({
          kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
          description,
          fields: childCoordinates(columns.inputValueName),
        });
      case TYPE_KIND_ENUM:
        return withOwners({
          kind: Kind.ENUM_TYPE_DEFINITION,
          description,
          values: childCoordinates(columns.enumValueName),
        });
      case TYPE_KIND_UNION:
        return withOwners({
          kind: Kind.UNION_TYPE_DEFINITION,
          description,
          members: this.typeRefNames(type),
        });
      default:
        return withOwners({
          kind: Kind.SCALAR_TYPE_DEFINITION,
          description,
          ...(columns.typeFlags[type] & TYPE_FLAG_BUILT_IN ? { builtIn: true as const } : {}),
        });
    }
  }

  /** Names of the interfaces of an object or interface type, or the members of a union. */
  private typeRefNames(type: number): Array<string> {
    const { typeRefsStart, typeRefsLength, typeRefs } = this.columns;
    const names: Array<string> = [];
    for (
      let typeRef = typeRefsStart[type], end = typeRef + typeRefsLength[type];
      typeRef < end;
      typeRef++
    ) {
      names.push(this.typeNameOf(typeRefs[typeRef]));
    }
    return names;
  }

  private inputValue(inputValue: number) {
    const columns = this.columns;
    const defaultValue = this.lazyStrings.get(columns.inputValueDefaultValue[inputValue]);
    return {
      name: this.string(columns.inputValueName[inputValue]),
      description: this.lazyStrings.get(columns.inputValueDescription[inputValue]),
      deprecationReason: this.lazyStrings.get(columns.inputValueDeprecationReason[inputValue]),
      defaultValue: defaultValue === undefined ? undefined : (JSON.parse(defaultValue) as unknown),
      type: formatTypeRef(
        this.typeNameOf(columns.inputValueType[inputValue]),
        columns.inputValueTypeWrapping[inputValue],
      ),
    };
  }

  /**
   * Materializes a type with its fields, arguments or values.
   * Returns null if there is no such type.
   */
  getTypeEntity(typename: string): SchemaExplorerTypeEntity | null {
    const type = this.findTypeId(typename);
    if (type === NONE) {
      return null;
    }
    const columns = this.columns;
    const description = this.lazyStrings.get(columns.typeDescription[type]);
    const childrenStart = columns.typeChildrenStart[type];
    const childrenEnd = childrenStart + columns.typeChildrenLength[type];

    switch (columns.typeKind[type]) {
      case TYPE_KIND_OBJECT:
      case TYPE_KIND_INTERFACE: {
        const fields: Array<GraphQLFieldMapper['entity']> = [];
        for (let field = childrenStart; field < childrenEnd; field++) {
          const args = [];
          for (
            let argument = columns.fieldArgsStart[field],
              argsEnd = argument + columns.fieldArgsLength[field];
            argument < argsEnd;
            argument++
          ) {
            args.push(this.inputValue(argument));
          }
          fields.push({
            name: this.string(columns.fieldName[field]),
            description: this.lazyStrings.get(columns.fieldDescription[field]),
            deprecationReason: this.lazyStrings.get(columns.fieldDeprecationReason[field]),
            type: formatTypeRef(
              this.typeNameOf(columns.fieldType[field]),
              columns.fieldTypeWrapping[field],
            ),
            args,
          });
        }
        return {
          kind:
            columns.typeKind[type] === TYPE_KIND_OBJECT
              ? Kind.OBJECT_TYPE_DEFINITION
              : Kind.INTERFACE_TYPE_DEFINITION,
          name: typename,
          description,
          interfaces: this.typeRefNames(type),
          fields,
        };
      }
      case TYPE_KIND_INPUT_OBJECT: {
        const fields = [];
        for (let inputValue = childrenStart; inputValue < childrenEnd; inputValue++) {
          fields.push(this.inputValue(inputValue));
        }
        return { kind: Kind.INPUT_OBJECT_TYPE_DEFINITION, name: typename, description, fields };
      }
      case TYPE_KIND_ENUM: {
        const values = [];
        for (let enumValue = childrenStart; enumValue < childrenEnd; enumValue++) {
          values.push({
            name: this.string(columns.enumValueName[enumValue]),
            description: this.lazyStrings.get(columns.enumValueDescription[enumValue]),
            deprecationReason: this.lazyStrings.get(columns.enumValueDeprecationReason[enumValue]),
          });
        }
        return { kind: Kind.ENUM_TYPE_DEFINITION, name: typename, description, values };
      }
      case TYPE_KIND_UNION:
        return {
          kind: Kind.UNION_TYPE_DEFINITION,
          name: typename,
          description,
          members: this.typeRefNames(type).map(name => ({ name })),
        };
      default:
        return { kind: Kind.SCALAR_TYPE_DEFINITION, name: typename, description };
    }
  }

  /** The given types, materialized (unknown names are skipped). */
  getTypeEntities(typenames: ReadonlyArray<string>): Array<SchemaExplorerTypeEntity> {
    return typenames.flatMap(typename => this.getTypeEntity(typename) ?? []);
  }

  /**
   * A type whose `name` and `kind` are read right away. Everything else (description, fields,
   * interfaces, values, members) is materialized on first access, so listing types (e.g. names and
   * owners for the type filter) materializes none of them.
   * Returns null if there is no such type.
   */
  getLazyTypeEntity(typename: string): SchemaExplorerTypeEntity | null {
    const type = this.findTypeId(typename);
    if (type === NONE) {
      return null;
    }
    const kind = TYPE_KINDS[this.columns.typeKind[type]];
    const LazyTypeEntity = LAZY_TYPE_ENTITY_CLASSES[kind];
    return new LazyTypeEntity(
      kind,
      typename,
      () => this.getTypeEntity(typename)!,
    ) as unknown as SchemaExplorerTypeEntity;
  }

  /**
   * Names of the types (without built-in scalars) the unused explorer has to look at: object,
   * interface and input object types with an unused field, argument or input field, and enums,
   * unions and scalars that are unused themselves. Every other type is entirely used, so
   * `onlyUnusedTypes` would remove it anyway.
   */
  getTypesWithUnusedCoordinates(usedCoordinates: ReadonlySet<string>): Array<string> {
    // Looking up a coordinate hashes it in JS; building one and calling `Set.has` hashes natively
    // and costs about half as much. Go over whichever side has fewer coordinates.
    const { typeCount, fieldCount, inputValueCount, enumValueCount } = this.header;
    const schemaCoordinates = typeCount + fieldCount + inputValueCount + enumValueCount;
    return usedCoordinates.size * 2 < schemaCoordinates
      ? this.typesWithUnusedCoordinatesByLookup(usedCoordinates)
      : this.typesWithUnusedCoordinatesByScan(usedCoordinates);
  }

  /** Marks the used coordinates by looking each one up, then scans the columns. */
  private typesWithUnusedCoordinatesByLookup(usedCoordinates: ReadonlySet<string>) {
    const columns = this.columns;
    const typeUsed = new Uint8Array(this.header.typeCount);
    const fieldUsed = new Uint8Array(this.header.fieldCount);
    const inputValueUsed = new Uint8Array(this.header.inputValueCount);
    for (const coordinate of usedCoordinates) {
      const handle = this.lookup(coordinate);
      switch (handleKind(handle)) {
        case HANDLE_KIND_TYPE:
          typeUsed[handleIndex(handle)] = 1;
          break;
        case HANDLE_KIND_FIELD:
          fieldUsed[handleIndex(handle)] = 1;
          break;
        case HANDLE_KIND_INPUT_VALUE:
          inputValueUsed[handleIndex(handle)] = 1;
          break;
      }
    }

    return this.typesWhere(type => {
      const childrenStart = columns.typeChildrenStart[type];
      const childrenEnd = childrenStart + columns.typeChildrenLength[type];
      switch (columns.typeKind[type]) {
        case TYPE_KIND_OBJECT:
        case TYPE_KIND_INTERFACE:
          for (let field = childrenStart; field < childrenEnd; field++) {
            if (!fieldUsed[field]) {
              return true;
            }
            for (
              let argument = columns.fieldArgsStart[field],
                argsEnd = argument + columns.fieldArgsLength[field];
              argument < argsEnd;
              argument++
            ) {
              if (!inputValueUsed[argument]) {
                return true;
              }
            }
          }
          return false;
        case TYPE_KIND_INPUT_OBJECT:
          for (let inputValue = childrenStart; inputValue < childrenEnd; inputValue++) {
            if (!inputValueUsed[inputValue]) {
              return true;
            }
          }
          return false;
        default:
          return !typeUsed[type];
      }
    });
  }

  /** Builds the coordinates of each type until one of them is not in the used set. */
  private typesWithUnusedCoordinatesByScan(usedCoordinates: ReadonlySet<string>) {
    const columns = this.columns;
    return this.typesWhere(type => {
      const typename = this.typeNameOf(type);
      const childrenStart = columns.typeChildrenStart[type];
      const childrenEnd = childrenStart + columns.typeChildrenLength[type];
      switch (columns.typeKind[type]) {
        case TYPE_KIND_OBJECT:
        case TYPE_KIND_INTERFACE:
          for (let field = childrenStart; field < childrenEnd; field++) {
            const fieldCoordinate = `${typename}.${this.string(columns.fieldName[field])}`;
            if (!usedCoordinates.has(fieldCoordinate)) {
              return true;
            }
            for (
              let argument = columns.fieldArgsStart[field],
                argsEnd = argument + columns.fieldArgsLength[field];
              argument < argsEnd;
              argument++
            ) {
              const argumentName = this.string(columns.inputValueName[argument]);
              if (!usedCoordinates.has(`${fieldCoordinate}.${argumentName}`)) {
                return true;
              }
            }
          }
          return false;
        case TYPE_KIND_INPUT_OBJECT:
          for (let inputValue = childrenStart; inputValue < childrenEnd; inputValue++) {
            const inputFieldName = this.string(columns.inputValueName[inputValue]);
            if (!usedCoordinates.has(`${typename}.${inputFieldName}`)) {
              return true;
            }
          }
          return false;
        default:
          return !usedCoordinates.has(typename);
      }
    });
  }

  /** Names of the types (without built-in scalars) matching `predicate`, sorted by name. */
  private typesWhere(predicate: (type: number) => boolean): Array<string> {
    const result: Array<string> = [];
    for (let type = 0; type < this.header.typeCount; type++) {
      if (!(this.columns.typeFlags[type] & TYPE_FLAG_BUILT_IN) && predicate(type)) {
        result.push(this.typeNameOf(type));
      }
    }
    return result;
  }
}
