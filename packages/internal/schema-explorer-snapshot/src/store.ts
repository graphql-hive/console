/**
 * Everything the API and the workflows service must agree on for schema explorer snapshots:
 * building one from SDL, and how it is stored in Redis (key, format, compression, TTL).
 *
 * The workflows service builds snapshots (`SchemaExplorerSnapshotBuildTask`) and writes them with
 * `writeSchemaExplorerSnapshot`; the API reads them with `readSchemaExplorerSnapshot`.
 */
import { promisify } from 'node:util';
import { zstdCompress, zstdDecompress } from 'node:zlib';
import { isTypeSystemExtensionNode, print } from 'graphql';
import { mergeTypeDefs } from '@graphql-tools/merge';
import {
  containsSupergraphSpec,
  transformSupergraphToPublicSchema,
} from '@theguild/federation-composition';
import {
  encodeSchemaExplorerSnapshot,
  SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION,
  SchemaExplorerSnapshotReader,
} from './flat-snapshot';
import { parseGraphQLSource } from './schema';
import { buildSchemaExplorerSnapshot } from './snapshot';

/** A schema version never changes after it is written; the TTL only bounds Redis memory. */
export const SCHEMA_EXPLORER_SNAPSHOT_TTL_SECONDS = 7 * 24 * 60 * 60;

export function schemaExplorerSnapshotKey(schemaVersionId: string) {
  return `schema-explorer-snapshot:v${SCHEMA_EXPLORER_SNAPSHOT_FORMAT_VERSION}:zstd:${schemaVersionId}`;
}

/** The Redis commands used here, so both the API's and the workflows service's clients fit. */
export type SchemaExplorerSnapshotRedis = {
  getBuffer(key: string): Promise<Buffer | null>;
  setex(key: string, seconds: number, value: Buffer): Promise<unknown>;
  exists(key: string): Promise<number>;
};

// Run on libuv's thread pool, so neither blocks the event loop.
const compress = promisify(zstdCompress);
const decompress = promisify(zstdDecompress);

export type SchemaExplorerSnapshotInput = {
  /** The public (composite) schema. */
  compositeSdl: string;
  /** The supergraph, for subgraph ownership; null for non-federated projects. */
  supergraphSdl: string | null;
};

/** Parses the SDL and encodes the binary snapshot. CPU heavy for large schemas. */
export function buildSchemaExplorerSnapshotBuffer(input: SchemaExplorerSnapshotInput): Buffer {
  const schemaAst = parseGraphQLSource(input.compositeSdl, 'SchemaExplorerSnapshot: Composite');
  const supergraphAst = input.supergraphSdl
    ? parseGraphQLSource(input.supergraphSdl, 'SchemaExplorerSnapshot: Supergraph')
    : null;
  return encodeSchemaExplorerSnapshot(buildSchemaExplorerSnapshot(schemaAst, supergraphAst));
}

/** Compresses the snapshot and stores it, so every API instance can read it. */
export async function writeSchemaExplorerSnapshot(
  redis: SchemaExplorerSnapshotRedis,
  schemaVersionId: string,
  snapshot: Buffer,
) {
  await redis.setex(
    schemaExplorerSnapshotKey(schemaVersionId),
    SCHEMA_EXPLORER_SNAPSHOT_TTL_SECONDS,
    await compress(snapshot),
  );
}

/**
 * The stored snapshot, or null if there is none.
 * Throws if the stored value cannot be decompressed or read (e.g. a buffer of another format).
 */
export async function readSchemaExplorerSnapshot(
  redis: SchemaExplorerSnapshotRedis,
  schemaVersionId: string,
): Promise<SchemaExplorerSnapshotReader | null> {
  const stored = await redis.getBuffer(schemaExplorerSnapshotKey(schemaVersionId));
  if (!stored) {
    return null;
  }
  const reader = SchemaExplorerSnapshotReader.fromBuffer(await decompress(stored));
  if (!reader) {
    throw new Error('The stored schema explorer snapshot could not be read.');
  }
  return reader;
}

/** Whether a snapshot is stored, without fetching it. */
export async function hasSchemaExplorerSnapshot(
  redis: SchemaExplorerSnapshotRedis,
  schemaVersionId: string,
): Promise<boolean> {
  return (await redis.exists(schemaExplorerSnapshotKey(schemaVersionId))) > 0;
}

/**
 * Turns a stored composite schema SDL into a proper public schema: strips the supergraph spec if
 * it was persisted by mistake and merges type extensions into their definitions.
 * `onFix` is called with a description whenever the SDL had to be changed.
 */
export function autoFixCompositeSchemaSdl(sdl: string, onFix?: (message: string) => void): string {
  const isFederationV1Output = sdl.includes('@core');
  // Poor's man check for type extensions to avoid parsing the SDL if it's not necessary.
  // Checks if the `extend` keyword is followed by a space or a newline and it's not a part of a word.
  const hasPotentiallyTypeExtensions = /\bextend(?=[\s\n])/.test(sdl);

  /**
   * If the SDL is clean from Supergraph spec or it's an output of @apollo/federation, we don't need to transform it.
   * We ignore @apollo/federation, because we never really transformed the output of it to public schema.
   * Doing so might be a breaking change for some users (like: removed join__Graph type).
   */
  if (!isFederationV1Output && containsSupergraphSpec(sdl)) {
    onFix?.('Composite schema SDL contains supergraph spec, transforming to public schema');
    return print(
      transformSupergraphToPublicSchema(parseGraphQLSource(sdl, 'autoFixCompositeSchemaSdl')),
    );
  }

  /**
   * If the SDL has type extensions, we need to merge them into matching definitions.
   */
  if (hasPotentiallyTypeExtensions) {
    const schemaAst = parseGraphQLSource(sdl, 'autoFixCompositeSchemaSdl');
    const hasTypeExtensions = schemaAst.definitions.some(isTypeSystemExtensionNode);

    if (!hasTypeExtensions) {
      return sdl;
    }

    onFix?.(
      'Composite schema AST contains type extensions, merging them into matching definitions',
    );
    return print(mergeTypeDefs(schemaAst));
  }

  return sdl;
}
