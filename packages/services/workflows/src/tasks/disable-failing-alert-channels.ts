import { z } from 'zod';
import { toQueryParams, type SqlStatement } from '@hive/clickhouse';
import { psql } from '@hive/postgres';
import { defineTask, implementTask } from '../kit.js';
import type { ClickHouseClient } from '../lib/clickhouse-client.js';
import {
  candidateChannelsStatement,
  channelFailuresStatement,
  disableCutoff,
  retentionFloor,
  shouldDisable,
} from '../lib/failing-channels.js';
import {
  alertChannelsAutoDisabledCounter,
  alertChannelSweepClickHouseQueryDuration,
} from '../metrics.js';

/**
 * Hourly: disables the alert channels that have been failing for 48 hours, the rule the channel
 * page announces. Picks the channels that may qualify from the per-channel state rollup, checks
 * each of them against `outbound_deliveries` since it was last enabled, and sets `disabled_at`
 * with no `disabled_by_user_id`, which the page reads as "Hive disabled it". Deletes nothing.
 */
export const DisableFailingAlertChannelsTask = defineTask({
  name: 'disableFailingAlertChannels',
  // A cron job's payload carries no `input`; under zod v4 an `unknown` key is still required.
  schema: z.unknown().optional(),
});

const EnabledChannelRowSchema = z.object({
  id: z.string(),
  /** `to_json(enabled_at)`: kept verbatim so the UPDATE below compares Postgres' own precision. */
  enabledAt: z.string(),
});

const CandidateRowSchema = z.object({
  organization_id: z.string(),
  delivery_type: z.string(),
  destination: z.string(),
});

// The count is a UInt64 and arrives quoted (output_format_json_quote_64bit_integers).
const FailuresRowSchema = z.object({
  failures: z.coerce.number(),
  failing_since: z.coerce.number(),
});

/** Runs one of the sweep's ClickHouse queries, timed for the Metric Alerts dashboard. */
async function timedQuery<T>(
  clickhouse: ClickHouseClient,
  query: 'candidates' | 'channel',
  queryId: string,
  statement: SqlStatement,
  rowSchema: z.ZodType<T>,
): Promise<T[]> {
  const startMs = Date.now();
  let rows: T[];
  try {
    const raw = await clickhouse.query(statement.sql, queryId, toQueryParams(statement));
    rows = z.array(rowSchema).parse(raw);
  } catch (error) {
    alertChannelSweepClickHouseQueryDuration.observe(
      { query, outcome: 'error' },
      (Date.now() - startMs) / 1000,
    );
    throw error;
  }
  alertChannelSweepClickHouseQueryDuration.observe(
    { query, outcome: 'success' },
    (Date.now() - startMs) / 1000,
  );
  return rows;
}

export const task = implementTask(DisableFailingAlertChannelsTask, async ({ context, logger }) => {
  const clickhouse = context.clickhouse;
  if (!clickhouse) {
    logger.warn('ClickHouse is not configured; failing alert channels are not disabled');
    return;
  }
  const now = new Date();

  // Postgres first: a channel enabled after this read has another enabled_at, and the UPDATE's
  // guard leaves it alone.
  const enabledChannels = new Map(
    z
      .array(EnabledChannelRowSchema)
      .parse(
        await context.pg.any(psql`
          SELECT "id", to_json("enabled_at") AS "enabledAt"
          FROM "alert_channels"
          WHERE "disabled_at" IS NULL
        `),
      )
      .map(row => [row.id, row.enabledAt]),
  );

  const candidates = (
    await timedQuery(
      clickhouse,
      'candidates',
      'failing-alert-channel-candidates',
      candidateChannelsStatement({
        cutoff: disableCutoff(now),
        retentionFloor: retentionFloor(now),
      }),
      CandidateRowSchema,
    )
  ).filter(candidate => enabledChannels.has(candidate.destination));
  logger.debug(
    { candidates: candidates.length, enabledChannels: enabledChannels.size },
    'Checking alert channels that may have been failing for 48 hours',
  );

  let disabled = 0;
  for (const candidate of candidates) {
    const channelId = candidate.destination;
    const enabledAt = enabledChannels.get(channelId)!;

    let rows;
    try {
      rows = await timedQuery(
        clickhouse,
        'channel',
        'failing-alert-channel',
        channelFailuresStatement({
          organizationId: candidate.organization_id,
          deliveryType: candidate.delivery_type,
          destination: channelId,
          since: new Date(enabledAt),
        }),
        FailuresRowSchema,
      );
    } catch (error) {
      // The next hour checks this channel again; the others are not held up.
      logger.error(
        { error, channelId },
        'Failed to read the delivery failures of an alert channel',
      );
      continue;
    }
    const row = rows[0];
    if (!row) {
      continue;
    }
    const failingSince = row.failing_since === 0 ? null : new Date(row.failing_since * 1000);
    if (!shouldDisable({ failures: row.failures, failingSince, now })) {
      continue;
    }

    // The guard repeats the enabled_at read above verbatim (to_json keeps Postgres' microseconds),
    // so a channel re-enabled or paused in the meantime is left alone.
    const disabledId = await context.pg.maybeOneFirst(psql`
      UPDATE "alert_channels"
      SET "disabled_at" = NOW(), "disabled_by_user_id" = NULL
      WHERE "id" = ${channelId} AND "disabled_at" IS NULL AND "enabled_at" = ${enabledAt}::timestamptz
      RETURNING "id"
    `);
    if (!disabledId) {
      continue;
    }
    disabled++;
    alertChannelsAutoDisabledCounter.inc();
    logger.info(
      { channelId, failures: row.failures, failingSince },
      'Disabled alert channel after failing for 48 hours',
    );
  }
  logger.debug({ disabled }, 'Finished checking failing alert channels');
});
