import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { formatDateTime, sql } from '@hive/clickhouse';
import { ClickHouse } from '../../operations/providers/clickhouse-client';
import type { AuditLogEventType } from '../providers/audit-logs-types';
import { isPositionAfter, type AuditLogPosition } from './audit-log-cursor';
import type { AuditLogEventRow } from './audit-log-envelope';

// Aliased as `unixTimestamp`, since `timestamp` would shadow the column in WHERE/ORDER BY.
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

export type AuditLogPage = {
  rows: AuditLogEventRow[];
  hasMore: boolean;
  /** On the last page, this is past the last returned row, up to the scanned `highWater`. */
  next: AuditLogPosition;
};

function toDateTime(timestamp: number) {
  return sql`toDateTime(${formatDateTime(new Date(timestamp * 1000))}, 'UTC')`;
}

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class AuditLogEventReader {
  constructor(private clickHouse: ClickHouse) {}

  async readPage(args: {
    organizationId: string;
    after: AuditLogPosition;
    highWater: number;
    eventTypes: readonly AuditLogEventType[] | null;
    limit: number;
  }): Promise<AuditLogPage> {
    const { organizationId, after, highWater, eventTypes, limit } = args;

    if (after.timestamp > highWater) {
      return { rows: [], hasMore: false, next: after };
    }

    // The redundant `timestamp >=` lets ClickHouse use the primary key; the tuple comparison alone doesn't.
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

    if (hasMore) {
      return { rows, hasMore, next: lastPosition };
    }

    // Everything up to `highWater` was scanned, so advance there even past non-matching rows or
    // without any rows, so a quiet organization's cursor never falls behind the retention period.
    // `{ highWater, '' }` lies before every event of second `highWater`, so none are skipped.
    const scanned = { timestamp: highWater, id: '' };
    return {
      rows,
      hasMore,
      next: isPositionAfter(scanned, lastPosition) ? scanned : lastPosition,
    };
  }
}
