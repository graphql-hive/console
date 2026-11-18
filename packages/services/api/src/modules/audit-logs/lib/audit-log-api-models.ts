import { z } from 'zod';

/**
 * Response shapes of the audit log API (`GET /audit-log/v1/events`). They are a public contract
 * for SIEM integrations: change them only in backwards-compatible ways (new optional fields), or
 * introduce a new envelope `version`.
 *
 * Descriptions live in `.meta()` so they end up in the JSON Schema (`auditLogApiJSONSchemas`).
 * Kept free of other imports so clients and tests can share them.
 */

export const AuditLogActorTypeModel = z.enum(['user', 'organizationAccessToken', 'system']).meta({
  id: 'AuditLogActorType',
  description:
    '`user` or `organizationAccessToken` when the event was caused by one; `system` when there was no authenticated actor (a background job, or an unauthenticated request such as a failed sign in).',
});

export const AuditLogEnvelopeV1Model = z
  .object({
    version: z.literal(1).meta({
      description:
        'Envelope version. Backwards-incompatible changes to the event shape introduce a new version.',
    }),
    id: z.string().meta({
      description:
        'Stable, unique id of the event. Delivery is at-least-once, so clients should dedupe on it.',
    }),
    timestamp: z.iso.datetime().meta({
      description: 'When the event happened, ISO 8601 in UTC with second precision.',
      examples: ['2026-11-02T10:00:00Z'],
    }),
    eventType: z.string().meta({
      description:
        'The audit log event type. A plain string rather than an enum, so clients built against an older list keep parsing events of types added later.',
      examples: ['USER_INVITED'],
    }),
    organization: z
      .object({
        id: z.string().meta({ description: 'Organization id.' }),
      })
      .meta({ description: 'The organization the event belongs to.' }),
    actor: z
      .object({
        type: AuditLogActorTypeModel,
        user: z
          .object({
            id: z.string().meta({ description: 'User id.' }),
            email: z.string().meta({ description: 'Email address of the user.' }),
          })
          .nullable()
          .meta({ description: 'The user that caused the event; null unless `type` is `user`.' }),
        accessToken: z
          .object({
            id: z.string().meta({ description: 'Organization access token id.' }),
            firstCharacters: z.string().nullable().meta({
              description: 'The first characters of the access token, to recognize it.',
            }),
          })
          .nullable()
          .meta({
            description:
              'The organization access token that caused the event; null unless `type` is `organizationAccessToken`.',
          }),
        ipAddress: z.string().nullable().meta({
          description: 'IP address of the client that caused the event, when known.',
        }),
        userAgent: z.string().nullable().meta({
          description: 'User agent of the client that caused the event, when known.',
        }),
      })
      .meta({ description: 'Who caused the event.' }),
    metadata: z.record(z.string(), z.unknown()).meta({
      description: 'Event-type specific details.',
    }),
  })
  .meta({
    id: 'AuditLogEventV1',
    title: 'Audit log event (v1)',
    description: 'One audit log event as returned by the audit log API.',
  });

export const AuditLogEventsPageModel = z
  .object({
    events: z.array(AuditLogEnvelopeV1Model).meta({
      description:
        'Events after the requested position, oldest first, ordered by timestamp, then id.',
    }),
    nextCursor: z.string().meta({
      description:
        'Opaque cursor; pass it as `cursor` to read on. Present on every page, including empty ones, so clients can always store it.',
    }),
    hasMore: z.boolean().meta({
      description:
        'Whether more events are available right now. When false, poll again later with `nextCursor`.',
    }),
    cursorExpired: z.boolean().meta({
      description:
        'The requested cursor was older than the retention period; events right after it may be missing.',
    }),
  })
  .meta({
    id: 'AuditLogEventsPage',
    title: 'Audit log events page',
    description: 'Response of `GET /audit-log/v1/events`.',
  });

export const AuditLogApiErrorCodeModel = z
  .enum([
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'RATE_LIMITED',
    'INVALID_PARAMETER',
    'INVALID_CURSOR',
    'INTERNAL_ERROR',
  ])
  .meta({
    id: 'AuditLogApiErrorCode',
    description:
      'UNAUTHENTICATED (401): missing or invalid organization access token. FORBIDDEN (403): the token lacks `auditLog:describe`. RATE_LIMITED (429): retry after `Retry-After` seconds. INVALID_PARAMETER / INVALID_CURSOR (400): fix the request. INTERNAL_ERROR (500): retry with the same cursor.',
  });

export const AuditLogApiErrorModel = z
  .object({
    error: z
      .object({
        code: AuditLogApiErrorCodeModel,
        message: z.string().meta({ description: 'Human-readable explanation.' }),
      })
      .meta({ description: 'What went wrong.' }),
  })
  .meta({
    id: 'AuditLogApiError',
    title: 'Audit log API error',
    description: 'Body of every non-2xx response of the audit log API.',
  });

export type AuditLogActorType = z.infer<typeof AuditLogActorTypeModel>;
export type AuditLogEnvelopeV1 = z.infer<typeof AuditLogEnvelopeV1Model>;
export type AuditLogEventsPage = z.infer<typeof AuditLogEventsPageModel>;
export type AuditLogApiErrorCode = z.infer<typeof AuditLogApiErrorCodeModel>;
export type AuditLogApiError = z.infer<typeof AuditLogApiErrorModel>;

/**
 * JSON Schemas (draft 2020-12) of the audit log API responses, e.g. for public docs or for
 * generating clients. Each schema's root is a `$ref` into its `$defs`, where shared parts (event,
 * actor type, error code) are defined once.
 *
 * Converted with `io: 'input'` so objects are not closed with `additionalProperties: false`:
 * adding optional fields is a backwards-compatible change, and validators built from these
 * schemas must keep accepting responses that carry them.
 */
export function auditLogApiJSONSchemas() {
  const options = { io: 'input' } as const;
  return {
    AuditLogEventsPage: z.toJSONSchema(AuditLogEventsPageModel, options),
    AuditLogEventV1: z.toJSONSchema(AuditLogEnvelopeV1Model, options),
    AuditLogApiError: z.toJSONSchema(AuditLogApiErrorModel, options),
  };
}
