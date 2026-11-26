/**
 * Builds the binary schema explorer snapshot of a schema version and stores it in Redis, where
 * every API instance reads it.
 *
 * The API schedules this on a cache miss (`SchemaExplorerSnapshotBuilder`) and waits for the
 * outcome on the `schemaExplorerSnapshot` pubsub channel, so building a large schema (seconds of
 * CPU) never blocks the API.
 */
import { z } from 'zod';
import { psql } from '@hive/postgres';
import {
  autoFixCompositeSchemaSdl,
  buildSchemaExplorerSnapshotBuffer,
  writeSchemaExplorerSnapshot,
  type SchemaExplorerSnapshotInput,
} from '@hive/schema-explorer-snapshot';
import type { Context } from '../context';
import { defineTask, implementTask } from '../kit.js';
import { createSchemaObject } from '../lib/schema/provider';

export const SchemaExplorerSnapshotBuildTask = defineTask({
  name: 'schemaExplorerSnapshotBuild',
  schema: z.object({
    schemaVersionId: z.string(),
    /**
     * Composition settings for versions without persisted SDL, which have to be composed again
     * from their schemas. Null for all other versions.
     */
    legacyComposition: z
      .object({
        externalComposition: z.object({
          enabled: z.boolean(),
          endpoint: z.string().nullable().optional(),
          encryptedSecret: z.string().nullable().optional(),
        }),
        native: z.boolean(),
      })
      .nullable(),
  }),
  // The waiting API request is the retry: a failed build is reported to it right away.
  maxAttempts: 1,
});

const SchemaVersionSdlModel = z.object({
  hasPersistedSchemaChanges: z.boolean(),
  compositeSchemaSdl: z.string().nullable(),
  supergraphSdl: z.string().nullable(),
});

export const task = implementTask(SchemaExplorerSnapshotBuildTask, async args => {
  const { schemaVersionId } = args.input;
  const publish = (status: 'READY' | 'EMPTY' | 'ERROR', reason: string | null = null) =>
    args.context.pubSub.publish('schemaExplorerSnapshot', schemaVersionId, { status, reason });

  try {
    const input = await loadSnapshotInput(args);
    if (!input) {
      publish('EMPTY');
      return;
    }

    const snapshot = buildSchemaExplorerSnapshotBuffer(input);
    await writeSchemaExplorerSnapshot(args.context.redis, schemaVersionId, snapshot);
    args.logger.info({ 'snapshot.bytes': snapshot.length }, 'Built schema explorer snapshot');
    publish('READY');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    args.logger.error('Failed to build schema explorer snapshot: %s', reason);
    publish('ERROR', reason);
    throw error;
  }
});

/**
 * The composite and supergraph SDL of the version, like `SchemaVersionHelper` in the API reads
 * them (`getCompositeSchemaSdl` / `getSupergraphSdl`), or null if the version has no schema.
 */
async function loadSnapshotInput(args: {
  input: z.output<(typeof SchemaExplorerSnapshotBuildTask)['schema']>;
  requestId?: string;
  context: Context;
  logger: { warn(message: string, ...args: unknown[]): void };
}): Promise<SchemaExplorerSnapshotInput | null> {
  const { schemaVersionId, legacyComposition } = args.input;
  const row = await args.context.pg
    .maybeOne(
      psql`/* getSchemaVersionSdl */
        SELECT
            "has_persisted_schema_changes" AS "hasPersistedSchemaChanges"
          , "composite_schema_sdl" AS "compositeSchemaSdl"
          , "supergraph_sdl" AS "supergraphSdl"
        FROM "schema_versions"
        WHERE "id" = ${schemaVersionId}
      `,
    )
    .then(SchemaVersionSdlModel.nullable().parse);

  if (!row) {
    return null;
  }

  if (row.hasPersistedSchemaChanges) {
    if (!row.compositeSchemaSdl) {
      return null;
    }
    return {
      compositeSdl: row.supergraphSdl
        ? autoFixCompositeSchemaSdl(row.compositeSchemaSdl, message =>
            args.logger.warn('%s (versionId: %s)', message, schemaVersionId),
          )
        : row.compositeSchemaSdl,
      supergraphSdl: row.supergraphSdl,
    };
  }

  // Legacy versions: compose again from the version's schemas.
  if (!legacyComposition) {
    throw new Error(
      `Schema version ${schemaVersionId} has no persisted SDL and no composition settings.`,
    );
  }
  const schemas = await args.context.schema.schemasOfVersion({
    versionId: schemaVersionId,
    pool: args.context.pg,
  });
  if (schemas.length === 0) {
    return null;
  }
  const composition = await args.context.schema.composeAndValidate(
    schemas[0].type,
    schemas.map(schema => createSchemaObject(schema)),
    {
      external: legacyComposition.externalComposition,
      native: legacyComposition.native,
      contracts: null,
    },
    { requestId: args.requestId },
  );
  return composition.sdl
    ? { compositeSdl: composition.sdl, supergraphSdl: composition.supergraph ?? null }
    : null;
}
