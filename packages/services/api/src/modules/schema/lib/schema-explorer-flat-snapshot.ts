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
import type {
  SchemaExplorerEntry,
  SchemaExplorerSnapshot,
  SchemaExplorerTypeEntity,
} from './schema-explorer-snapshot';

/** Bump when the layout or the meaning of a column changes, so stale snapshots are not read. */
export const SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION = 1;

const MAGIC = 'HSE';
const NONE = -1;

type TypeKind = Extract<SchemaExplorerEntry['kind'], `${string}TypeDefinition`>;

const TYPE_KINDS = [
  Kind.SCALAR_TYPE_DEFINITION,
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
] as const satisfies ReadonlyArray<TypeKind>;
// 0 is a scalar
const K_OBJECT = 1;
const K_INTERFACE = 2;
const K_UNION = 3;
const K_ENUM = 4;
const K_INPUT = 5;

/** Type flags */
const T_BUILT_IN = 1;
/** Input value flags */
const V_ARGUMENT = 1;

// A handle packs (entity kind, index) into one small integer: what a coordinate lookup returns.
const H_TYPE = 1;
const H_FIELD = 2;
const H_VALUE = 3;
const H_ENUM_VALUE = 4;
const H_SHIFT = 2 ** 26;
const handleKind = (handle: number) => Math.floor(handle / H_SHIFT);
const handleIndex = (handle: number) => handle % H_SHIFT;
const makeHandle = (kind: number, index: number) => kind * H_SHIFT + index;

// ---------------------------------------------------------------------------------------------
// Layout

const HEADER_WORDS = [
  'S', // strings
  'H', // string hash table slots
  'CH', // coordinate hash table slots
  'G', // subgraphs
  'T', // types
  'F', // fields
  'V', // input values (arguments and input fields)
  'E', // enum values
  'R', // type references (interfaces, union members)
  'O', // owner sets
  'OI', // owner set items
  'B', // string blob bytes
  'D', // deprecated types
  'query',
  'mutation',
  'subscription',
] as const;
type Header = Record<(typeof HEADER_WORDS)[number], number>;
const HEADER_OFFSET = 8;
const HEADER_END = Math.ceil((HEADER_OFFSET + HEADER_WORDS.length * 4) / 8) * 8;

type CountKey = Exclude<keyof Header, 'query' | 'mutation' | 'subscription'> | 'S1' | 'O1';
type ArrayConstructor =
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Uint16ArrayConstructor
  | Uint8ArrayConstructor;

const COLUMNS = [
  // strings
  ['strOff', Uint32Array, 'S1'], // UTF-16 offsets into the decoded blob
  ['strHash', Int32Array, 'H'],
  ['typeByStr', Int32Array, 'S'],
  ['coordHash', Int32Array, 'CH'],
  ['subgraphs', Int32Array, 'G'],
  // types (in name order)
  ['tName', Int32Array, 'T'],
  ['tDesc', Int32Array, 'T'],
  ['tOwners', Int32Array, 'T'],
  ['tChildStart', Uint32Array, 'T'],
  ['tChildCount', Uint32Array, 'T'],
  ['tRefStart', Uint32Array, 'T'],
  ['tRefCount', Uint32Array, 'T'],
  ['tKind', Uint8Array, 'T'],
  ['tFlags', Uint8Array, 'T'],
  // fields of object and interface types
  ['fName', Int32Array, 'F'],
  ['fDesc', Int32Array, 'F'],
  ['fDepr', Int32Array, 'F'],
  ['fOwners', Int32Array, 'F'],
  ['fType', Uint32Array, 'F'],
  ['fArgStart', Uint32Array, 'F'],
  ['fArgCount', Uint32Array, 'F'],
  ['fParent', Uint32Array, 'F'],
  ['fWrap', Uint16Array, 'F'],
  // input values: arguments (parent is a field) and input fields (parent is a type)
  ['vName', Int32Array, 'V'],
  ['vDesc', Int32Array, 'V'],
  ['vDefault', Int32Array, 'V'],
  ['vDepr', Int32Array, 'V'],
  ['vOwners', Int32Array, 'V'],
  ['vType', Uint32Array, 'V'],
  ['vParent', Uint32Array, 'V'],
  ['vWrap', Uint16Array, 'V'],
  ['vFlags', Uint8Array, 'V'],
  // enum values
  ['eName', Int32Array, 'E'],
  ['eDesc', Int32Array, 'E'],
  ['eDepr', Int32Array, 'E'],
  ['eOwners', Int32Array, 'E'],
  ['eParent', Uint32Array, 'E'],
  // misc
  ['refs', Uint32Array, 'R'],
  ['osStart', Uint32Array, 'O1'],
  ['osItems', Uint16Array, 'OI'],
  ['deprecatedTypes', Uint32Array, 'D'],
  ['blob', Uint8Array, 'B'],
] as const satisfies ReadonlyArray<readonly [string, ArrayConstructor, CountKey]>;

type ColumnName = (typeof COLUMNS)[number][0];
type Columns = {
  [N in ColumnName]: InstanceType<Extract<(typeof COLUMNS)[number], readonly [N, any, any]>[1]>;
};

function countOf(header: Header, key: CountKey) {
  return key === 'S1' ? header.S + 1 : key === 'O1' ? header.O + 1 : header[key];
}

function layout(header: Header) {
  let offset = HEADER_END;
  const offsets: Array<number> = [];
  for (const [, ctor, key] of COLUMNS) {
    offsets.push(offset);
    offset += countOf(header, key) * ctor.BYTES_PER_ELEMENT;
    offset = (offset + 7) & ~7;
  }
  return { offsets, total: offset };
}

/** FNV-1a over UTF-16 code units of `s[start, end)`. */
function fnv(s: string, start: number, end: number) {
  let hash = 0x811c9dc5;
  for (let i = start; i < end; i++) {
    hash = Math.imul(hash ^ s.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------------------------
// Type references

/** `[[Foo!]!]` → `{ name: 'Foo', wrap }`, wrap = list depth (3 bits) | non-null mask << 3. */
function parseTypeRef(type: string) {
  let i = 0;
  let depth = 0;
  while (type.charCodeAt(i) === 91 /* [ */) {
    depth++;
    i++;
  }
  let j = i;
  while (
    j < type.length &&
    type.charCodeAt(j) !== 33 /* ! */ &&
    type.charCodeAt(j) !== 93 /* ] */
  ) {
    j++;
  }
  const name = type.slice(i, j);
  let level = depth;
  let mask = 0;
  if (type.charCodeAt(j) === 33) {
    mask |= 1 << level;
    j++;
  }
  while (j < type.length) {
    if (type.charCodeAt(j) === 93) {
      level--;
      j++;
    }
    if (type.charCodeAt(j) === 33) {
      mask |= 1 << level;
      j++;
    }
  }
  if (depth > 7) {
    throw new Error(`Type ${type} is nested in too many lists.`);
  }
  return { name, wrap: depth | (mask << 3) };
}

function formatTypeRef(name: string, wrap: number) {
  const depth = wrap & 7;
  const mask = wrap >> 3;
  let out = '['.repeat(depth) + name;
  if (mask & (1 << depth)) {
    out += '!';
  }
  for (let level = depth - 1; level >= 0; level--) {
    out += ']';
    if (mask & (1 << level)) {
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
  const strings: Array<string> = [];
  const stringIds = new Map<string, number>();
  const str = (value: string | null | undefined) => {
    if (value == null) {
      return NONE;
    }
    // The GraphQL parser rejects lone surrogates; should one appear anyway, replace it rather
    // than failing, as UTF-8 cannot represent it.
    const wellFormed = value.isWellFormed() ? value : value.toWellFormed();
    let id = stringIds.get(wellFormed);
    if (id === undefined) {
      id = strings.length;
      strings.push(wellFormed);
      stringIds.set(wellFormed, id);
    }
    return id;
  };

  const subgraphIndex = new Map(snapshot.subgraphNames.map((name, index) => [name, index]));
  const subgraphs = snapshot.subgraphNames.map(str);
  const osStart: Array<number> = [0];
  const osItems: Array<number> = [];
  const ownerSets = new Map<string, number>();
  /** Interns a list of owning subgraphs, keeping its order. */
  const owners = (serviceNames: ReadonlyArray<string> | undefined) => {
    if (!serviceNames) {
      return NONE;
    }
    const indexes = serviceNames.map(name => {
      const index = subgraphIndex.get(name);
      if (index === undefined) {
        throw new Error(`Subgraph ${name} is missing from the subgraph names.`);
      }
      return index;
    });
    const key = indexes.join(',');
    let id = ownerSets.get(key);
    if (id === undefined) {
      id = osStart.length - 1;
      osItems.push(...indexes);
      osStart.push(osItems.length);
      ownerSets.set(key, id);
    }
    return id;
  };

  const typeIds = new Map(snapshot.types.map((name, index) => [name, index]));
  const typeId = (name: string) => {
    const id = typeIds.get(name);
    if (id === undefined) {
      throw new Error(`Type ${name} is missing from the snapshot.`);
    }
    return id;
  };
  const entryOf = <TKind extends SchemaExplorerEntry['kind']>(coordinate: string, kind: TKind) => {
    const entry = snapshot.coordinates[coordinate];
    if (entry?.kind !== kind) {
      throw new Error(`Expected schema coordinate ${coordinate} to be ${kind}.`);
    }
    return entry as Extract<SchemaExplorerEntry, { kind: TKind }>;
  };

  const T = snapshot.types.length;
  const t = {
    name: new Int32Array(T),
    desc: new Int32Array(T),
    owners: new Int32Array(T),
    childStart: new Uint32Array(T),
    childCount: new Uint32Array(T),
    refStart: new Uint32Array(T),
    refCount: new Uint32Array(T),
    kind: new Uint8Array(T),
    flags: new Uint8Array(T),
  };
  const f = {
    name: [] as Array<number>,
    desc: [] as Array<number>,
    depr: [] as Array<number>,
    owners: [] as Array<number>,
    type: [] as Array<number>,
    argStart: [] as Array<number>,
    argCount: [] as Array<number>,
    parent: [] as Array<number>,
    wrap: [] as Array<number>,
    argCoordinates: [] as Array<ReadonlyArray<string>>,
  };
  const v = {
    name: [] as Array<number>,
    desc: [] as Array<number>,
    default: [] as Array<number>,
    depr: [] as Array<number>,
    owners: [] as Array<number>,
    type: [] as Array<number>,
    parent: [] as Array<number>,
    wrap: [] as Array<number>,
    flags: [] as Array<number>,
  };
  const e = {
    name: [] as Array<number>,
    desc: [] as Array<number>,
    depr: [] as Array<number>,
    owners: [] as Array<number>,
    parent: [] as Array<number>,
  };
  const refs: Array<number> = [];

  const addInputValue = (coordinate: string, parent: number, isArgument: boolean) => {
    const value = entryOf(coordinate, Kind.INPUT_VALUE_DEFINITION);
    const ref = parseTypeRef(value.type);
    v.name.push(str(nameOf(coordinate)));
    v.desc.push(str(value.description));
    v.default.push(
      value.defaultValue === undefined ? NONE : str(JSON.stringify(value.defaultValue)),
    );
    v.depr.push(str(value.deprecationReason));
    v.owners.push(owners(value.ownedBy));
    v.type.push(typeId(ref.name));
    v.wrap.push(ref.wrap);
    v.parent.push(parent);
    v.flags.push(isArgument ? V_ARGUMENT : 0);
  };

  // Pass 1: types and their direct children. Arguments are added afterwards, so the arguments of
  // a field and the children of a type are contiguous ranges.
  snapshot.types.forEach((typename, i) => {
    const entry = snapshot.coordinates[typename];
    if (!entry) {
      throw new Error(`Type ${typename} is missing from the snapshot.`);
    }
    const kind = TYPE_KINDS.indexOf(entry.kind as TypeKind);
    if (kind === -1) {
      throw new Error(`Expected schema coordinate ${typename} to be a type.`);
    }
    t.name[i] = str(typename);
    t.desc[i] = str(entry.description);
    t.owners[i] = owners(entry.ownedBy);
    t.kind[i] = kind;
    t.refStart[i] = refs.length;

    switch (entry.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION:
        entry.interfaces.forEach(name => refs.push(typeId(name)));
        t.childStart[i] = f.name.length;
        t.childCount[i] = entry.fields.length;
        for (const coordinate of entry.fields) {
          const field = entryOf(coordinate, Kind.FIELD_DEFINITION);
          const ref = parseTypeRef(field.type);
          f.name.push(str(nameOf(coordinate)));
          f.desc.push(str(field.description));
          f.depr.push(str(field.deprecationReason));
          f.owners.push(owners(field.ownedBy));
          f.type.push(typeId(ref.name));
          f.wrap.push(ref.wrap);
          f.parent.push(i);
          f.argStart.push(0);
          f.argCount.push(field.args.length);
          f.argCoordinates.push(field.args);
        }
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        t.childStart[i] = v.name.length;
        t.childCount[i] = entry.fields.length;
        entry.fields.forEach(coordinate => addInputValue(coordinate, i, false));
        break;
      case Kind.ENUM_TYPE_DEFINITION:
        t.childStart[i] = e.name.length;
        t.childCount[i] = entry.values.length;
        for (const coordinate of entry.values) {
          const value = entryOf(coordinate, Kind.ENUM_VALUE_DEFINITION);
          e.name.push(str(nameOf(coordinate)));
          e.desc.push(str(value.description));
          e.depr.push(str(value.deprecationReason));
          e.owners.push(owners(value.ownedBy));
          e.parent.push(i);
        }
        break;
      case Kind.UNION_TYPE_DEFINITION:
        entry.members.forEach(name => refs.push(typeId(name)));
        break;
      case Kind.SCALAR_TYPE_DEFINITION:
        t.flags[i] = entry.builtIn ? T_BUILT_IN : 0;
        break;
    }
    t.refCount[i] = refs.length - t.refStart[i];
  });

  // Pass 2: arguments.
  f.argCoordinates.forEach((argCoordinates, field) => {
    f.argStart[field] = v.name.length;
    argCoordinates.forEach(coordinate => addInputValue(coordinate, field, true));
  });

  // Strings: one blob, a hash table from string to id, and type ids by name string.
  const joined = strings.join('');
  const blob = new TextEncoder().encode(joined);
  const strOff = new Uint32Array(strings.length + 1);
  for (let i = 0, offset = 0; i < strings.length; i++) {
    strOff[i] = offset;
    offset += strings[i].length;
    strOff[i + 1] = offset;
  }
  let H = 16;
  while (H < strings.length * 2) {
    H <<= 1;
  }
  const strHash = new Int32Array(H).fill(NONE);
  strings.forEach((value, id) => {
    let slot = fnv(value, 0, value.length) & (H - 1);
    while (strHash[slot] !== NONE) {
      slot = (slot + 1) & (H - 1);
    }
    strHash[slot] = id;
  });
  const typeByStr = new Int32Array(strings.length).fill(NONE);
  for (let i = 0; i < T; i++) {
    typeByStr[t.name[i]] = i;
  }

  // Schema coordinate → handle. Coordinates are only built here; they are not stored.
  const coordinateCount = T + f.name.length + v.name.length + e.name.length;
  let CH = 16;
  while (CH < coordinateCount * 2) {
    CH <<= 1;
  }
  const coordHash = new Int32Array(CH).fill(NONE);
  const putCoordinate = (coordinate: string, handle: number) => {
    let slot = fnv(coordinate, 0, coordinate.length) & (CH - 1);
    while (coordHash[slot] !== NONE) {
      slot = (slot + 1) & (CH - 1);
    }
    coordHash[slot] = handle;
  };
  const fieldCoordinate = (field: number) =>
    `${strings[t.name[f.parent[field]]]}.${strings[f.name[field]]}`;
  for (let i = 0; i < T; i++) {
    putCoordinate(strings[t.name[i]], makeHandle(H_TYPE, i));
  }
  for (let i = 0; i < f.name.length; i++) {
    putCoordinate(fieldCoordinate(i), makeHandle(H_FIELD, i));
  }
  for (let i = 0; i < v.name.length; i++) {
    const parent =
      v.flags[i] & V_ARGUMENT ? fieldCoordinate(v.parent[i]) : strings[t.name[v.parent[i]]];
    putCoordinate(`${parent}.${strings[v.name[i]]}`, makeHandle(H_VALUE, i));
  }
  for (let i = 0; i < e.name.length; i++) {
    putCoordinate(
      `${strings[t.name[e.parent[i]]]}.${strings[e.name[i]]}`,
      makeHandle(H_ENUM_VALUE, i),
    );
  }

  const rootTypeId = (name: string | null) => (name === null ? NONE : typeId(name));
  const header: Header = {
    S: strings.length,
    H,
    CH,
    G: subgraphs.length,
    T,
    F: f.name.length,
    V: v.name.length,
    E: e.name.length,
    R: refs.length,
    O: osStart.length - 1,
    OI: osItems.length,
    B: blob.length,
    D: snapshot.deprecatedTypes.length,
    query: rootTypeId(snapshot.queryTypeName),
    mutation: rootTypeId(snapshot.mutationTypeName),
    subscription: rootTypeId(snapshot.subscriptionTypeName),
  };
  const data: Record<ColumnName, ArrayLike<number>> = {
    strOff,
    strHash,
    typeByStr,
    coordHash,
    subgraphs,
    tName: t.name,
    tDesc: t.desc,
    tOwners: t.owners,
    tChildStart: t.childStart,
    tChildCount: t.childCount,
    tRefStart: t.refStart,
    tRefCount: t.refCount,
    tKind: t.kind,
    tFlags: t.flags,
    fName: f.name,
    fDesc: f.desc,
    fDepr: f.depr,
    fOwners: f.owners,
    fType: f.type,
    fArgStart: f.argStart,
    fArgCount: f.argCount,
    fParent: f.parent,
    fWrap: f.wrap,
    vName: v.name,
    vDesc: v.desc,
    vDefault: v.default,
    vDepr: v.depr,
    vOwners: v.owners,
    vType: v.type,
    vParent: v.parent,
    vWrap: v.wrap,
    vFlags: v.flags,
    eName: e.name,
    eDesc: e.desc,
    eDepr: e.depr,
    eOwners: e.owners,
    eParent: e.parent,
    refs,
    osStart,
    osItems,
    deprecatedTypes: snapshot.deprecatedTypes.map(typeId),
    blob,
  };

  const { offsets, total } = layout(header);
  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < MAGIC.length; i++) {
    bytes[i] = MAGIC.charCodeAt(i);
  }
  bytes[3] = SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION;
  const words = new Uint32Array(buffer, HEADER_OFFSET, HEADER_WORDS.length);
  HEADER_WORDS.forEach((key, i) => {
    words[i] = header[key] >>> 0;
  });
  COLUMNS.forEach(([name, ctor, key], i) => {
    new ctor(buffer, offsets[i], countOf(header, key)).set(data[name]);
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
  private ownerSetNames: Array<Array<string> | undefined>;
  private cachedSubgraphNames: Array<string> | null = null;
  private cachedDeprecatedTypes: Array<string> | null = null;

  private constructor(
    private buffer: Buffer,
    private c: Columns,
    private h: Header,
    private text: string,
  ) {
    this.ownerSetNames = new Array(h.O);
  }

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
      HEADER_WORDS.forEach((key, i) => {
        header[key] = words[i];
      });
      header.query |= 0;
      header.mutation |= 0;
      header.subscription |= 0;

      const { offsets, total } = layout(header);
      if (total > buffer.length) {
        return null;
      }
      const views: Record<string, unknown> = {};
      COLUMNS.forEach(([name, ctor, key], i) => {
        views[name] = new ctor(arrayBuffer, base + offsets[i], countOf(header, key));
      });
      const columns = views as Columns;
      const text = new TextDecoder().decode(columns.blob);
      if (text.length !== columns.strOff[header.S]) {
        return null;
      }
      return new SchemaExplorerSnapshotReader(buffer, columns, header, text);
    } catch {
      return null;
    }
  }

  static fromSnapshot(snapshot: SchemaExplorerSnapshot) {
    const reader = SchemaExplorerSnapshotReader.fromBuffer(encodeSchemaExplorerSnapshot(snapshot));
    if (!reader) {
      throw new Error('Failed to read the encoded schema explorer snapshot.');
    }
    return reader;
  }

  /** Size of the binary snapshot in bytes. */
  get byteLength() {
    return this.buffer.length;
  }

  /** The binary snapshot, e.g. for storing it. */
  toBuffer() {
    return this.buffer;
  }

  // ------------------------------------------------------------------------------- strings

  private str(id: number): string {
    return this.text.substring(this.c.strOff[id], this.c.strOff[id + 1]);
  }

  private strOrUndefined(id: number): string | undefined {
    return id === NONE ? undefined : this.str(id);
  }

  /** Id of `s[start, end)` without allocating it, or NONE. */
  private strId(s: string, start = 0, end = s.length): number {
    const { strHash, strOff } = this.c;
    const mask = this.h.H - 1;
    const length = end - start;
    let slot = fnv(s, start, end) & mask;
    for (;;) {
      const id = strHash[slot];
      if (id === NONE) {
        return NONE;
      }
      const offset = strOff[id];
      if (strOff[id + 1] - offset === length) {
        let k = 0;
        while (k < length && this.text.charCodeAt(offset + k) === s.charCodeAt(start + k)) {
          k++;
        }
        if (k === length) {
          return id;
        }
      }
      slot = (slot + 1) & mask;
    }
  }

  private typeId(name: string): number {
    const id = this.strId(name);
    return id === NONE ? NONE : this.c.typeByStr[id];
  }

  private typeName(type: number) {
    return this.str(this.c.tName[type]);
  }

  // ------------------------------------------------------------------- coordinate lookup

  /** Position after the string `id` if `s` continues with it at `position`, otherwise -1. */
  private matchSegment(s: string, position: number, id: number): number {
    const offset = this.c.strOff[id];
    const length = this.c.strOff[id + 1] - offset;
    if (position + length > s.length) {
      return -1;
    }
    for (let k = 0; k < length; k++) {
      if (this.text.charCodeAt(offset + k) !== s.charCodeAt(position + k)) {
        return -1;
      }
    }
    return position + length;
  }

  private coordinateEquals(coordinate: string, handle: number): boolean {
    const c = this.c;
    const i = handleIndex(handle);
    let type: number;
    let member: number;
    let argument = NONE;
    switch (handleKind(handle)) {
      case H_TYPE:
        return this.matchSegment(coordinate, 0, c.tName[i]) === coordinate.length;
      case H_FIELD:
        type = c.fParent[i];
        member = c.fName[i];
        break;
      case H_ENUM_VALUE:
        type = c.eParent[i];
        member = c.eName[i];
        break;
      default:
        if (c.vFlags[i] & V_ARGUMENT) {
          const field = c.vParent[i];
          type = c.fParent[field];
          member = c.fName[field];
          argument = c.vName[i];
        } else {
          type = c.vParent[i];
          member = c.vName[i];
        }
    }
    let position = this.matchSegment(coordinate, 0, c.tName[type]);
    if (position < 0 || coordinate.charCodeAt(position) !== 46 /* . */) {
      return false;
    }
    position = this.matchSegment(coordinate, position + 1, member);
    if (argument === NONE) {
      return position === coordinate.length;
    }
    if (position < 0 || coordinate.charCodeAt(position) !== 46) {
      return false;
    }
    return this.matchSegment(coordinate, position + 1, argument) === coordinate.length;
  }

  /** `Type`, `Type.field`, `Type.field.argument`, `Input.field` or `Enum.VALUE` → handle or NONE. */
  private lookup(coordinate: string): number {
    const table = this.c.coordHash;
    const mask = this.h.CH - 1;
    let slot = fnv(coordinate, 0, coordinate.length) & mask;
    for (;;) {
      const handle = table[slot];
      if (handle === NONE) {
        return NONE;
      }
      if (this.coordinateEquals(coordinate, handle)) {
        return handle;
      }
      slot = (slot + 1) & mask;
    }
  }

  private ownerSet(set: number): Array<string> | null {
    if (set === NONE) {
      return null;
    }
    let names = this.ownerSetNames[set];
    if (!names) {
      const { osStart, osItems, subgraphs } = this.c;
      names = [];
      for (let i = osStart[set]; i < osStart[set + 1]; i++) {
        names.push(this.str(subgraphs[osItems[i]]));
      }
      this.ownerSetNames[set] = names;
    }
    return names;
  }

  private ownerSetOf(handle: number) {
    const i = handleIndex(handle);
    switch (handleKind(handle)) {
      case H_TYPE:
        return this.c.tOwners[i];
      case H_FIELD:
        return this.c.fOwners[i];
      case H_VALUE:
        return this.c.vOwners[i];
      default:
        return this.c.eOwners[i];
    }
  }

  // --------------------------------------------------------------------------- public API

  get queryTypeName() {
    return this.h.query === NONE ? null : this.typeName(this.h.query);
  }
  get mutationTypeName() {
    return this.h.mutation === NONE ? null : this.typeName(this.h.mutation);
  }
  get subscriptionTypeName() {
    return this.h.subscription === NONE ? null : this.typeName(this.h.subscription);
  }
  /** All subgraphs owning a part of the supergraph, sorted by name. */
  get subgraphNames(): Array<string> {
    this.cachedSubgraphNames ??= Array.from(this.c.subgraphs, id => this.str(id));
    return this.cachedSubgraphNames;
  }
  /**
   * Types with a deprecated field, argument, enum value or input field, sorted by name.
   * The deprecated explorer only needs to look at these.
   */
  get deprecatedTypes(): Array<string> {
    this.cachedDeprecatedTypes ??= Array.from(this.c.deprecatedTypes, type => this.typeName(type));
    return this.cachedDeprecatedTypes;
  }

  /** All type names, sorted by name. */
  getTypeNames({ withBuiltInScalars }: { withBuiltInScalars: boolean }): Array<string> {
    const names: Array<string> = [];
    for (let type = 0; type < this.h.T; type++) {
      if (withBuiltInScalars || !(this.c.tFlags[type] & T_BUILT_IN)) {
        names.push(this.typeName(type));
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
    const c = this.c;
    const i = handleIndex(handle);
    const ownedBy = this.ownerSet(this.ownerSetOf(handle));
    const withOwners = (entry: SchemaExplorerEntry): SchemaExplorerEntry =>
      ownedBy ? { ...entry, ownedBy } : entry;

    switch (handleKind(handle)) {
      case H_FIELD: {
        const args: Array<string> = [];
        for (let a = c.fArgStart[i], end = a + c.fArgCount[i]; a < end; a++) {
          args.push(`${coordinate}.${this.str(c.vName[a])}`);
        }
        return withOwners({
          kind: Kind.FIELD_DEFINITION,
          description: this.strOrUndefined(c.fDesc[i]),
          deprecationReason: this.strOrUndefined(c.fDepr[i]),
          type: formatTypeRef(this.typeName(c.fType[i]), c.fWrap[i]),
          args,
        });
      }
      case H_VALUE: {
        const value = this.inputValue(i);
        return withOwners({
          kind: Kind.INPUT_VALUE_DEFINITION,
          description: value.description,
          deprecationReason: value.deprecationReason,
          type: value.type,
          ...(c.vDefault[i] === NONE ? {} : { defaultValue: value.defaultValue }),
        });
      }
      case H_ENUM_VALUE:
        return withOwners({
          kind: Kind.ENUM_VALUE_DEFINITION,
          description: this.strOrUndefined(c.eDesc[i]),
          deprecationReason: this.strOrUndefined(c.eDepr[i]),
        });
    }

    const typename = coordinate;
    const description = this.strOrUndefined(c.tDesc[i]);
    const start = c.tChildStart[i];
    const end = start + c.tChildCount[i];
    const children = (names: Int32Array) => {
      const coordinates: Array<string> = [];
      for (let child = start; child < end; child++) {
        coordinates.push(`${typename}.${this.str(names[child])}`);
      }
      return coordinates;
    };
    switch (c.tKind[i]) {
      case K_OBJECT:
      case K_INTERFACE:
        return withOwners({
          kind: TYPE_KINDS[c.tKind[i]] as
            | typeof Kind.OBJECT_TYPE_DEFINITION
            | typeof Kind.INTERFACE_TYPE_DEFINITION,
          description,
          interfaces: this.typeRefs(i),
          fields: children(c.fName),
        });
      case K_INPUT:
        return withOwners({
          kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
          description,
          fields: children(c.vName),
        });
      case K_ENUM:
        return withOwners({
          kind: Kind.ENUM_TYPE_DEFINITION,
          description,
          values: children(c.eName),
        });
      case K_UNION:
        return withOwners({
          kind: Kind.UNION_TYPE_DEFINITION,
          description,
          members: this.typeRefs(i),
        });
      default:
        return withOwners({
          kind: Kind.SCALAR_TYPE_DEFINITION,
          description,
          ...(c.tFlags[i] & T_BUILT_IN ? { builtIn: true as const } : {}),
        });
    }
  }

  private typeRefs(type: number): Array<string> {
    const names: Array<string> = [];
    for (let r = this.c.tRefStart[type], end = r + this.c.tRefCount[type]; r < end; r++) {
      names.push(this.typeName(this.c.refs[r]));
    }
    return names;
  }

  private inputValue(i: number) {
    const c = this.c;
    const defaultValue = c.vDefault[i];
    return {
      name: this.str(c.vName[i]),
      description: this.strOrUndefined(c.vDesc[i]),
      deprecationReason: this.strOrUndefined(c.vDepr[i]),
      defaultValue:
        defaultValue === NONE ? undefined : (JSON.parse(this.str(defaultValue)) as unknown),
      type: formatTypeRef(this.typeName(c.vType[i]), c.vWrap[i]),
    };
  }

  /**
   * Materializes a type with its fields, arguments or values.
   * Returns null if there is no such type.
   */
  getTypeEntity(typename: string): SchemaExplorerTypeEntity | null {
    const type = this.typeId(typename);
    if (type === NONE) {
      return null;
    }
    const c = this.c;
    const description = this.strOrUndefined(c.tDesc[type]);
    const start = c.tChildStart[type];
    const end = start + c.tChildCount[type];

    switch (c.tKind[type]) {
      case K_OBJECT:
      case K_INTERFACE: {
        const fields: Array<GraphQLFieldMapper['entity']> = [];
        for (let field = start; field < end; field++) {
          const args = [];
          for (let a = c.fArgStart[field], argsEnd = a + c.fArgCount[field]; a < argsEnd; a++) {
            args.push(this.inputValue(a));
          }
          fields.push({
            name: this.str(c.fName[field]),
            description: this.strOrUndefined(c.fDesc[field]),
            deprecationReason: this.strOrUndefined(c.fDepr[field]),
            type: formatTypeRef(this.typeName(c.fType[field]), c.fWrap[field]),
            args,
          });
        }
        return {
          kind:
            c.tKind[type] === K_OBJECT
              ? Kind.OBJECT_TYPE_DEFINITION
              : Kind.INTERFACE_TYPE_DEFINITION,
          name: typename,
          description,
          interfaces: this.typeRefs(type),
          fields,
        };
      }
      case K_INPUT: {
        const fields = [];
        for (let value = start; value < end; value++) {
          fields.push(this.inputValue(value));
        }
        return { kind: Kind.INPUT_OBJECT_TYPE_DEFINITION, name: typename, description, fields };
      }
      case K_ENUM: {
        const values = [];
        for (let value = start; value < end; value++) {
          values.push({
            name: this.str(c.eName[value]),
            description: this.strOrUndefined(c.eDesc[value]),
            deprecationReason: this.strOrUndefined(c.eDepr[value]),
          });
        }
        return { kind: Kind.ENUM_TYPE_DEFINITION, name: typename, description, values };
      }
      case K_UNION:
        return {
          kind: Kind.UNION_TYPE_DEFINITION,
          name: typename,
          description,
          members: this.typeRefs(type).map(name => ({ name })),
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
    const type = this.typeId(typename);
    if (type === NONE) {
      return null;
    }
    const kind = TYPE_KINDS[this.c.tKind[type]];
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
    const schemaCoordinates = this.h.T + this.h.F + this.h.V + this.h.E;
    return usedCoordinates.size * 2 < schemaCoordinates
      ? this.typesWithUnusedCoordinatesByLookup(usedCoordinates)
      : this.typesWithUnusedCoordinatesByScan(usedCoordinates);
  }

  /** Marks the used coordinates by looking each one up, then scans the columns. */
  private typesWithUnusedCoordinatesByLookup(usedCoordinates: ReadonlySet<string>) {
    const c = this.c;
    const typeUsed = new Uint8Array(this.h.T);
    const fieldUsed = new Uint8Array(this.h.F);
    const valueUsed = new Uint8Array(this.h.V);
    for (const coordinate of usedCoordinates) {
      const handle = this.lookup(coordinate);
      switch (handleKind(handle)) {
        case H_TYPE:
          typeUsed[handleIndex(handle)] = 1;
          break;
        case H_FIELD:
          fieldUsed[handleIndex(handle)] = 1;
          break;
        case H_VALUE:
          valueUsed[handleIndex(handle)] = 1;
          break;
      }
    }

    return this.typesWhere(type => {
      const start = c.tChildStart[type];
      const end = start + c.tChildCount[type];
      switch (c.tKind[type]) {
        case K_OBJECT:
        case K_INTERFACE:
          for (let field = start; field < end; field++) {
            if (!fieldUsed[field]) {
              return true;
            }
            for (let a = c.fArgStart[field], argsEnd = a + c.fArgCount[field]; a < argsEnd; a++) {
              if (!valueUsed[a]) {
                return true;
              }
            }
          }
          return false;
        case K_INPUT:
          for (let value = start; value < end; value++) {
            if (!valueUsed[value]) {
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
    const c = this.c;
    return this.typesWhere(type => {
      const typename = this.typeName(type);
      const start = c.tChildStart[type];
      const end = start + c.tChildCount[type];
      switch (c.tKind[type]) {
        case K_OBJECT:
        case K_INTERFACE:
          for (let field = start; field < end; field++) {
            const fieldCoordinate = `${typename}.${this.str(c.fName[field])}`;
            if (!usedCoordinates.has(fieldCoordinate)) {
              return true;
            }
            for (let a = c.fArgStart[field], argsEnd = a + c.fArgCount[field]; a < argsEnd; a++) {
              if (!usedCoordinates.has(`${fieldCoordinate}.${this.str(c.vName[a])}`)) {
                return true;
              }
            }
          }
          return false;
        case K_INPUT:
          for (let value = start; value < end; value++) {
            if (!usedCoordinates.has(`${typename}.${this.str(c.vName[value])}`)) {
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
    for (let type = 0; type < this.h.T; type++) {
      if (!(this.c.tFlags[type] & T_BUILT_IN) && predicate(type)) {
        result.push(this.typeName(type));
      }
    }
    return result;
  }
}
