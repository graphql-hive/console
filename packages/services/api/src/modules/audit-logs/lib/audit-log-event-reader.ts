import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { formatDateTime, sql } from '@hive/clickhouse';
import { ClickHouse } from '../../operations/providers/clickhouse-client';
import type { AuditLogEventType } from '../providers/audit-logs-types';
import { isPositionAfter, type AuditLogPosition } from './audit-log-cursor';
import type { AuditLogEventRow } from './audit-log-envelope';

// The unix timestamp is selected as `unixTimestamp`: an alias named `timestamp` would shadow the
// DateTime column in WHERE and ORDER BY.
const RowModel = z
  .object({
    id: z.string(),
    unixTimestamp: z.coerce.number(),
    eventAction: z.string(),
    userId: z.string(),
    userEmail: z.string(),
    accessTokenId: z.string(),
    ipAddress: z.string(),
    userAgent: z.string(),
    metadata: z.string(),
  })
  .transform(
    ({ unixTimestamp, ...row }): AuditLogEventRow => ({ ...row, timestamp: unixTimestamp }),
  );

const PositionRowModel = z
  .object({
    id: z.string(),
    unixTimestamp: z.coerce.number(),
  })
  .transform(({ id, unixTimestamp }): AuditLogPosition => ({ id, timestamp: unixTimestamp }));

export type AuditLogPage = {
  rows: AuditLogEventRow[];
  /** Whether more matching rows exist up to `highWater`. */
  hasMore: boolean;
  /**
   * Where the next page starts: the last returned row when `hasMore`, otherwise the newest row
   * scanned up to `highWater` (matching the filter or not), so a narrow filter never rescans a
   * range. Equal to the input position when nothing was scanned.
   */
  next: AuditLogPosition;
};

function toDateTime(timestamp: number) {
  return sql`toDateTime(${formatDateTime(new Date(timestamp * 1000))}, 'UTC')`;
}

/**
 * Reads an organization's audit log in `(timestamp, id)` order, page by page, for the audit log
 * API. Stateless: the caller owns the position.
 */
@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class AuditLogEventReader {
  constructor(private clickHouse: ClickHouse) {}

  async readPage(args: {
    organizationId: string;
    /** Rows strictly after this position are read. */
    after: AuditLogPosition;
    /** Rows newer than this unix timestamp (seconds) are not read yet (settle lag). */
    highWater: number;
    /** Only these event types; null for all. */
    eventTypes: readonly AuditLogEventType[] | null;
    limit: number;
  }): Promise<AuditLogPage> {
    const { organizationId, after, highWater, eventTypes, limit } = args;

    if (after.timestamp > highWater) {
      return { rows: [], hasMore: false, next: after };
    }

    // `timestamp >= after` is implied by the tuple comparison, but stated on its own it lets
    // ClickHouse use the primary key `(organization_id, timestamp)` and prune partitions.
    const range = sql`
      "organization_id" = ${organizationId}
      AND "timestamp" >= ${toDateTime(after.timestamp)}
      AND ("timestamp", "id") > (${toDateTime(after.timestamp)}, ${after.id})
      AND "timestamp" <= ${toDateTime(highWater)}
    `;
    const filter = eventTypes
      ? sql`AND "event_action" IN (${sql.array(eventTypes as string[], 'String')})`
      : sql``;

    const result = await this.clickHouse.query({
      query: sql`
        SELECT
          "id"
          , toUnixTimestamp("timestamp") AS "unixTimestamp"
          , "event_action" AS "eventAction"
          , "user_id" AS "userId"
          , "user_email" AS "userEmail"
          , "access_token_id" AS "accessTokenId"
          , "ip_address" AS "ipAddress"
          , "user_agent" AS "userAgent"
          , "metadata"
        FROM "audit_logs"
        WHERE ${range} ${filter}
        ORDER BY "timestamp" ASC, "id" ASC
        LIMIT ${sql.raw(String(limit + 1))}
      `,
      queryId: 'audit-log-api-page',
      timeout: 10_000,
    });

    const allRows = z.array(RowModel).parse(result.data);
    const hasMore = allRows.length > limit;
    const rows = hasMore ? allRows.slice(0, limit) : allRows;
    const last = rows.at(-1);
    const lastPosition = last ? { timestamp: last.timestamp, id: last.id } : after;

    if (hasMore || !eventTypes) {
      // Without a filter the last returned row is also the newest scanned one.
      return { rows, hasMore, next: lastPosition };
    }

    // With a filter, move past the rows that did not match, up to `highWater`.
    const newest = await this.clickHouse.query({
      query: sql`
        SELECT "id", toUnixTimestamp("timestamp") AS "unixTimestamp"
        FROM "audit_logs"
        WHERE ${range}
        ORDER BY "timestamp" DESC, "id" DESC
        LIMIT 1
      `,
      queryId: 'audit-log-api-scanned-position',
      timeout: 10_000,
    });
    const newestRow = z.array(PositionRowModel).parse(newest.data).at(0);
    const scanned = newestRow ?? after;

    return {
      rows,
      hasMore: false,
      next: isPositionAfter(scanned, lastPosition) ? scanned : lastPosition,
    };
  }
}
