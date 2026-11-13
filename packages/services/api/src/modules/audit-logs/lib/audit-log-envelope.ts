import type { AuditLogActorType, AuditLogEnvelopeV1 } from './audit-log-api-models';

export type AuditLogEventRow = {
  id: string;
  /** Unix timestamp in seconds. */
  timestamp: number;
  eventAction: string;
  userId: string;
  userEmail: string;
  accessTokenId: string;
  ipAddress: string;
  userAgent: string;
  metadata: string;
};

export function toAuditLogEnvelopeV1(
  row: AuditLogEventRow,
  organizationId: string,
): AuditLogEnvelopeV1 {
  const { user: _user, accessToken, ...metadata } = parseMetadata(row.metadata);

  const type: AuditLogActorType = row.userId
    ? 'user'
    : row.accessTokenId
      ? 'organizationAccessToken'
      : 'system';

  return {
    version: 1,
    id: row.id,
    timestamp: new Date(row.timestamp * 1000).toISOString().replace('.000Z', 'Z'),
    eventType: row.eventAction,
    organization: { id: organizationId },
    actor: {
      type,
      user: row.userId ? { id: row.userId, email: row.userEmail } : null,
      accessToken: row.accessTokenId
        ? { id: row.accessTokenId, firstCharacters: readFirstCharacters(accessToken) }
        : null,
      ipAddress: row.ipAddress || null,
      userAgent: row.userAgent || null,
    },
    metadata,
  };
}

function parseMetadata(raw: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readFirstCharacters(accessToken: unknown): string | null {
  if (typeof accessToken !== 'object' || accessToken === null) {
    return null;
  }
  const { firstCharacters } = accessToken as { firstCharacters?: unknown };
  return typeof firstCharacters === 'string' ? firstCharacters : null;
}
