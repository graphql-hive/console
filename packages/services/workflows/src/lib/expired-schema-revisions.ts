import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';

export async function purgeExpiredSchemaRevisions(args: {
  pool: PostgresDatabasePool;
  expiresAt: Date;
}) {
  return args.pool.transaction('purgeExpiredSchemaRevisions', async pool => {
    const deletedSchemaRevisions = await pool.any(psql`
      DELETE FROM "schema_revisions"
      WHERE "first_published_at" IS NULL
        AND "expires_at" IS NOT NULL
        AND "expires_at" <= ${args.expiresAt.toISOString()}
      RETURNING "digest"
    `);
    const digests = [
      ...new Set(z.array(z.object({ digest: z.string() })).parse(deletedSchemaRevisions).map(row => row.digest)),
    ];

    const deletedSdlArtifactCount = digests.length
      ? await pool
          .oneFirst(psql`
            WITH "deleted" AS (
              DELETE FROM "sdl_artifacts"
              WHERE "digest" = ANY(${psql.array(digests, 'text')})
                AND NOT EXISTS (
                  SELECT 1
                  FROM "schema_revisions"
                  WHERE "schema_revisions"."digest" = "sdl_artifacts"."digest"
                )
              RETURNING 1
            )
            SELECT COUNT(*)::int FROM "deleted"
          `)
          .then(z.number().parse)
      : 0;

    return {
      deletedSchemaRevisionCount: deletedSchemaRevisions.length,
      deletedSdlArtifactCount,
    };
  });
}
