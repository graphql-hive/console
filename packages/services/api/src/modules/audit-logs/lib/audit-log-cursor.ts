import { z } from 'zod';

export type AuditLogPosition = {
  /** Unix timestamp in seconds. */
  timestamp: number;
  /** Event id; the empty string sorts before every id, so `{ timestamp, id: '' }` starts at `timestamp`. */
  id: string;
};

const CURSOR_VERSION = 1;

const CursorModel = z.object({
  v: z.literal(CURSOR_VERSION),
  timestamp: z.number().int().nonnegative(),
  id: z.string().max(128),
});

export function encodeAuditLogCursor(position: AuditLogPosition): string {
  return Buffer.from(
    JSON.stringify({ v: CURSOR_VERSION, timestamp: position.timestamp, id: position.id }),
  ).toString('base64url');
}

export function decodeAuditLogCursor(cursor: string): AuditLogPosition | null {
  if (cursor.length === 0 || cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const result = CursorModel.safeParse(json);
  if (!result.success) {
    return null;
  }

  return { timestamp: result.data.timestamp, id: result.data.id };
}

export function isPositionAfter(a: AuditLogPosition, b: AuditLogPosition): boolean {
  return a.timestamp > b.timestamp || (a.timestamp === b.timestamp && a.id > b.id);
}
