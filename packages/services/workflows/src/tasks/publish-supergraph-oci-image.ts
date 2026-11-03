import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { publishSupergraphImage } from '../lib/oci/publish-supergraph-image.js';

/**
 * Builds and stores the OCI image of a composed supergraph schema version.
 *
 * Enqueued transactionally (via `graphile_worker.add_job`) by the API whenever a composable
 * schema version with a supergraph is created, see `SchemaVersionStore`.
 */
export const PublishSupergraphOciImageTask = defineTask({
  name: 'publishSupergraphOciImage',
  schema: z.object({
    graphVersionId: z.uuid(),
  }),
});

/** Stable job key, so a pending job for the same version is never added twice. */
export function buildPublishSupergraphOciImageJobKey(graphVersionId: string) {
  return `publishSupergraphOciImage:${graphVersionId}`;
}

export const PUBLISH_SUPERGRAPH_OCI_IMAGE_MAX_ATTEMPTS = 15;

export const task = implementTask(PublishSupergraphOciImageTask, async args => {
  const storage = args.context.ociStorage;

  if (!storage) {
    args.logger.warn(
      { graphVersionId: args.input.graphVersionId },
      'Artifact storage (S3_*) is not configured, skip publishing supergraph OCI image',
    );
    return;
  }

  const result = await publishSupergraphImage({
    pg: args.context.pg,
    storage,
    logger: args.logger,
    graphVersionId: args.input.graphVersionId,
  });

  if (result.type === 'skipped') {
    args.logger.info(
      { graphVersionId: args.input.graphVersionId, reason: result.reason },
      'Skipped publishing supergraph OCI image',
    );
    return;
  }

  args.logger.info(
    {
      graphVersionId: args.input.graphVersionId,
      repository: result.repository,
      tag: result.tag,
      manifestDigest: result.manifestDigest,
    },
    'Published supergraph OCI image',
  );
});
