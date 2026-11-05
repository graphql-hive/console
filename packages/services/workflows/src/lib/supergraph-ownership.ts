import { parse } from 'graphql';
import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import { psql, type CommonQueryMethods } from '@hive/postgres';
import {
  createOwnershipCache,
  extractSuperGraphInformation,
  type SuperGraphOwnership,
} from '@hive/supergraph';

export type OwnershipLoadFailure =
  | 'no-composable-version'
  | 'no-supergraph-sdl'
  | 'supergraph-parse-failed';

export type OwnershipLoadResult =
  | { info: SuperGraphOwnership; versionId: string }
  | { info: null; reason: OwnershipLoadFailure };

export type SupergraphOwnershipLoader = {
  load(targetId: string): Promise<OwnershipLoadResult>;
};

type OwnershipPg = Pick<CommonQueryMethods, 'maybeOneFirst'>;

// Keyed by schema version id and kept across ticks: without it every subgraph-filtered
// target would fetch and parse a multi-MB supergraph every 60 seconds.
const ownershipCache = createOwnershipCache();

/**
 * Loads who owns which field in a target's latest composable schema version. One loader
 * is created per evaluator tick; it dedupes concurrent loads for the same target within
 * the tick, and the parsed ownership is reused across ticks until the version changes.
 */
export function createSupergraphOwnershipLoader(
  pg: OwnershipPg,
  logger: Logger,
): SupergraphOwnershipLoader {
  const inflight = new Map<string, Promise<OwnershipLoadResult>>();
  return {
    load(targetId) {
      let pending = inflight.get(targetId);
      if (!pending) {
        pending = loadOwnership(pg, logger, targetId);
        inflight.set(targetId, pending);
      }
      return pending;
    },
  };
}

async function loadOwnership(
  pg: OwnershipPg,
  logger: Logger,
  targetId: string,
): Promise<OwnershipLoadResult> {
  // Same selection as `latestComposableSchemas` in lib/schema/provider.ts: the newest
  // composable version of the target's default graph, contract versions excluded.
  const versionId = await pg
    .maybeOneFirst(
      psql`/* metricAlertLatestComposableVersion */
        SELECT sv.id
        FROM schema_versions as sv
        WHERE
          sv.target_id = ${targetId}
          AND sv.is_composable IS TRUE
          AND (
            sv.graph_metadata IS NULL
            OR (
              sv.graph_metadata->>'name' = 'default'
              AND sv.graph_metadata->>'type' = 'default'
            )
          )
        ORDER BY sv.created_at DESC, sv.id DESC
        LIMIT 1
      `,
    )
    .then(z.string().nullable().parse);

  if (!versionId) {
    return { info: null, reason: 'no-composable-version' };
  }

  const cached = ownershipCache.get(versionId);
  if (cached) {
    return { info: cached, versionId };
  }

  // The SDL text is only pulled on a cache miss; it is often megabytes.
  const supergraphSdl = await pg
    .maybeOneFirst(
      psql`/* metricAlertSupergraphSdl */
        SELECT supergraph_sdl FROM schema_versions WHERE id = ${versionId}
      `,
    )
    .then(z.string().nullable().parse);

  if (!supergraphSdl) {
    return { info: null, reason: 'no-supergraph-sdl' };
  }

  try {
    const info = extractSuperGraphInformation(parse(supergraphSdl, { noLocation: true }));
    ownershipCache.set(versionId, info);
    return { info, versionId };
  } catch (error) {
    logger.warn(
      { error, targetId, versionId },
      'Failed to parse the supergraph of a schema version',
    );
    return { info: null, reason: 'supergraph-parse-failed' };
  }
}
