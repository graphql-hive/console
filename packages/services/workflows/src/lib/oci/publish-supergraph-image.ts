import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import { OciStorageKey } from '@hive/oci';
import { buildSupergraphImage, buildSupergraphTag } from '@hive/oci/node';
import { psql, type CommonQueryMethods } from '@hive/postgres';
import type { ObjectStorageWriter } from './object-storage.js';

const SchemaVersionModel = z.object({
  id: z.string(),
  targetId: z.string(),
  isComposable: z.boolean(),
  supergraphSdl: z.string().nullable(),
  graphId: z.string().nullable(),
  graphName: z.string().nullable(),
  graphType: z.string().nullable(),
});

/**
 * Contract graphs are stored as `default/<contract-name>`. The prefix carries no information
 * within the tag, and without it, the (validated) contract name is always a valid tag name.
 */
function graphNameForTag(graphName: string): string {
  const [name, contractName] = graphName.split('/');
  return contractName || name;
}

async function loadSchemaVersion(pg: CommonQueryMethods, graphVersionId: string) {
  const row = await pg.maybeOne(psql`/* loadSchemaVersionForOciImage */
    SELECT
      "id"
      , "target_id" AS "targetId"
      , "is_composable" AS "isComposable"
      , "supergraph_sdl" AS "supergraphSdl"
      , "graph_id" AS "graphId"
      , "graph_metadata"->>'name' AS "graphName"
      , "graph_metadata"->>'type' AS "graphType"
    FROM
      "schema_versions"
    WHERE
      "id" = ${graphVersionId}
  `);

  return row ? SchemaVersionModel.parse(row) : null;
}

export type PublishSupergraphImageResult =
  | { type: 'published'; repository: string; tag: string; manifestDigest: string }
  | { type: 'skipped'; reason: string };

/**
 * Builds the OCI image of a persisted schema version and writes it to object storage.
 *
 * The supergraph is never re-composed, the exact persisted SDL is used.
 * Safe to execute repeatedly or concurrently: all objects except the tag are content addressed,
 * and the tag is deterministic and written last, so it never points to an incomplete image.
 */
export async function publishSupergraphImage(args: {
  pg: CommonQueryMethods;
  storage: ObjectStorageWriter;
  logger: Logger;
  graphVersionId: string;
}): Promise<PublishSupergraphImageResult> {
  const { logger, storage } = args;
  const version = await loadSchemaVersion(args.pg, args.graphVersionId);

  if (!version) {
    return { type: 'skipped', reason: 'Schema version does not exist.' };
  }
  if (!version.isComposable || !version.supergraphSdl) {
    return { type: 'skipped', reason: 'Schema version is not composable or has no supergraph.' };
  }
  if (!version.graphId || !version.graphName) {
    return { type: 'skipped', reason: 'Schema version is not associated with a graph.' };
  }

  const image = buildSupergraphImage({
    supergraphSdl: version.supergraphSdl,
    graphId: version.graphId,
    graphVersionId: version.id,
  });
  const tag = buildSupergraphTag(graphNameForTag(version.graphName), version.id);
  const manifestDigest = image.manifest.descriptor.digest;

  logger.debug(
    { targetId: version.targetId, graphId: version.graphId, tag, manifestDigest },
    'Publishing supergraph OCI image',
  );

  // 1. Layers
  await Promise.all(
    [image.layers.supergraph, image.layers.metadata].map(layer =>
      storage.putImmutable(
        OciStorageKey.blob(layer.descriptor.digest),
        layer.content,
        layer.descriptor.mediaType,
      ),
    ),
  );
  // 2. Config
  await storage.putImmutable(
    OciStorageKey.blob(image.config.descriptor.digest),
    image.config.content,
    image.config.descriptor.mediaType,
  );
  // 3. Manifest
  await storage.putImmutable(
    OciStorageKey.manifest(version.targetId, manifestDigest),
    image.manifest.content,
    image.manifest.descriptor.mediaType,
  );
  // 4. Tag, last, so it never exposes an incomplete image.
  await storage.put(
    OciStorageKey.tag(version.targetId, tag),
    Buffer.from(manifestDigest, 'utf8'),
    'text/plain',
  );

  return {
    type: 'published',
    repository: `supergraph/${version.targetId}`,
    tag,
    manifestDigest,
  };
}
