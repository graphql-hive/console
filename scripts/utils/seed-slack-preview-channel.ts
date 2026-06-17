/**
 * Shared seed-script helper: insert a preview-only SLACK alert channel.
 */

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');

/**
 * Channel name shown in the preview. Fixed, not configurable — it's only there to
 * render the preview, so there's nothing for a dev to point it at.
 */
export const SLACK_PREVIEW_CHANNEL_NAME = '#hive-alerts-testing';

export async function insertSlackPreviewChannel(args: {
  /** Postgres connection string, e.g. from `getSeedPGConnectionString()`. */
  connectionString: string;
  /** Project the channel belongs to (`alert_channels` is project-scoped). */
  projectId: string;
}): Promise<string> {
  const pool = await createPostgresDatabasePool({
    connectionParameters: args.connectionString,
  });
  try {
    const id = await pool.oneFirst(psql`
      INSERT INTO "alert_channels" ("type", "name", "slack_channel", "project_id")
      VALUES (
        'SLACK',
        ${`Slack ${SLACK_PREVIEW_CHANNEL_NAME} (preview only)`},
        ${SLACK_PREVIEW_CHANNEL_NAME},
        ${args.projectId}
      )
      RETURNING "id"
    `);
    return id as string;
  } finally {
    await pool.end();
  }
}
