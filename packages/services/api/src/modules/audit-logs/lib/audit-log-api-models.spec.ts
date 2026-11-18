import { auditLogApiJSONSchemas } from './audit-log-api-models';

test('JSON Schemas of the audit log API responses', () => {
  expect(auditLogApiJSONSchemas()).toMatchInlineSnapshot(`
    {
      AuditLogApiError: {
        $defs: {
          AuditLogApiError: {
            description: Body of every non-2xx response of the audit log API.,
            properties: {
              error: {
                description: What went wrong.,
                properties: {
                  code: {
                    $ref: #/$defs/AuditLogApiErrorCode,
                  },
                  message: {
                    description: Human-readable explanation.,
                    type: string,
                  },
                },
                required: [
                  code,
                  message,
                ],
                type: object,
              },
            },
            required: [
              error,
            ],
            title: Audit log API error,
            type: object,
          },
          AuditLogApiErrorCode: {
            description: UNAUTHENTICATED (401): missing or invalid organization access token. FORBIDDEN (403): the token lacks \`auditLog:describe\`. RATE_LIMITED (429): retry after \`Retry-After\` seconds. INVALID_PARAMETER / INVALID_CURSOR (400): fix the request. INTERNAL_ERROR (500): retry with the same cursor.,
            enum: [
              UNAUTHENTICATED,
              FORBIDDEN,
              RATE_LIMITED,
              INVALID_PARAMETER,
              INVALID_CURSOR,
              INTERNAL_ERROR,
            ],
            type: string,
          },
        },
        $ref: #/$defs/AuditLogApiError,
        $schema: https://json-schema.org/draft/2020-12/schema,
      },
      AuditLogEventV1: {
        $defs: {
          AuditLogActorType: {
            description: \`user\` or \`organizationAccessToken\` when the event was caused by one; \`system\` when there was no authenticated actor (a background job, or an unauthenticated request such as a failed sign in).,
            enum: [
              user,
              organizationAccessToken,
              system,
            ],
            type: string,
          },
          AuditLogEventV1: {
            description: One audit log event as returned by the audit log API.,
            properties: {
              actor: {
                description: Who caused the event.,
                properties: {
                  accessToken: {
                    anyOf: [
                      {
                        properties: {
                          firstCharacters: {
                            description: The first characters of the access token, to recognize it.,
                            type: [
                              string,
                              null,
                            ],
                          },
                          id: {
                            description: Organization access token id.,
                            type: string,
                          },
                        },
                        required: [
                          id,
                          firstCharacters,
                        ],
                        type: object,
                      },
                      {
                        type: null,
                      },
                    ],
                    description: The organization access token that caused the event; null unless \`type\` is \`organizationAccessToken\`.,
                  },
                  ipAddress: {
                    description: IP address of the client that caused the event, when known.,
                    type: [
                      string,
                      null,
                    ],
                  },
                  type: {
                    $ref: #/$defs/AuditLogActorType,
                  },
                  user: {
                    anyOf: [
                      {
                        properties: {
                          email: {
                            description: Email address of the user.,
                            type: string,
                          },
                          id: {
                            description: User id.,
                            type: string,
                          },
                        },
                        required: [
                          id,
                          email,
                        ],
                        type: object,
                      },
                      {
                        type: null,
                      },
                    ],
                    description: The user that caused the event; null unless \`type\` is \`user\`.,
                  },
                  userAgent: {
                    description: User agent of the client that caused the event, when known.,
                    type: [
                      string,
                      null,
                    ],
                  },
                },
                required: [
                  type,
                  user,
                  accessToken,
                  ipAddress,
                  userAgent,
                ],
                type: object,
              },
              eventType: {
                description: The audit log event type. A plain string rather than an enum, so clients built against an older list keep parsing events of types added later.,
                examples: [
                  USER_INVITED,
                ],
                type: string,
              },
              id: {
                description: Stable, unique id of the event. Delivery is at-least-once, so clients should dedupe on it.,
                type: string,
              },
              metadata: {
                additionalProperties: {},
                description: Event-type specific details.,
                propertyNames: {
                  type: string,
                },
                type: object,
              },
              organization: {
                description: The organization the event belongs to.,
                properties: {
                  id: {
                    description: Organization id.,
                    type: string,
                  },
                },
                required: [
                  id,
                ],
                type: object,
              },
              timestamp: {
                description: When the event happened, ISO 8601 in UTC with second precision.,
                examples: [
                  2026-11-02T10:00:00Z,
                ],
                format: date-time,
                pattern: ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$,
                type: string,
              },
              version: {
                const: 1,
                description: Envelope version. Backwards-incompatible changes to the event shape introduce a new version.,
                type: number,
              },
            },
            required: [
              version,
              id,
              timestamp,
              eventType,
              organization,
              actor,
              metadata,
            ],
            title: Audit log event (v1),
            type: object,
          },
        },
        $ref: #/$defs/AuditLogEventV1,
        $schema: https://json-schema.org/draft/2020-12/schema,
      },
      AuditLogEventsPage: {
        $defs: {
          AuditLogActorType: {
            description: \`user\` or \`organizationAccessToken\` when the event was caused by one; \`system\` when there was no authenticated actor (a background job, or an unauthenticated request such as a failed sign in).,
            enum: [
              user,
              organizationAccessToken,
              system,
            ],
            type: string,
          },
          AuditLogEventV1: {
            description: One audit log event as returned by the audit log API.,
            properties: {
              actor: {
                description: Who caused the event.,
                properties: {
                  accessToken: {
                    anyOf: [
                      {
                        properties: {
                          firstCharacters: {
                            description: The first characters of the access token, to recognize it.,
                            type: [
                              string,
                              null,
                            ],
                          },
                          id: {
                            description: Organization access token id.,
                            type: string,
                          },
                        },
                        required: [
                          id,
                          firstCharacters,
                        ],
                        type: object,
                      },
                      {
                        type: null,
                      },
                    ],
                    description: The organization access token that caused the event; null unless \`type\` is \`organizationAccessToken\`.,
                  },
                  ipAddress: {
                    description: IP address of the client that caused the event, when known.,
                    type: [
                      string,
                      null,
                    ],
                  },
                  type: {
                    $ref: #/$defs/AuditLogActorType,
                  },
                  user: {
                    anyOf: [
                      {
                        properties: {
                          email: {
                            description: Email address of the user.,
                            type: string,
                          },
                          id: {
                            description: User id.,
                            type: string,
                          },
                        },
                        required: [
                          id,
                          email,
                        ],
                        type: object,
                      },
                      {
                        type: null,
                      },
                    ],
                    description: The user that caused the event; null unless \`type\` is \`user\`.,
                  },
                  userAgent: {
                    description: User agent of the client that caused the event, when known.,
                    type: [
                      string,
                      null,
                    ],
                  },
                },
                required: [
                  type,
                  user,
                  accessToken,
                  ipAddress,
                  userAgent,
                ],
                type: object,
              },
              eventType: {
                description: The audit log event type. A plain string rather than an enum, so clients built against an older list keep parsing events of types added later.,
                examples: [
                  USER_INVITED,
                ],
                type: string,
              },
              id: {
                description: Stable, unique id of the event. Delivery is at-least-once, so clients should dedupe on it.,
                type: string,
              },
              metadata: {
                additionalProperties: {},
                description: Event-type specific details.,
                propertyNames: {
                  type: string,
                },
                type: object,
              },
              organization: {
                description: The organization the event belongs to.,
                properties: {
                  id: {
                    description: Organization id.,
                    type: string,
                  },
                },
                required: [
                  id,
                ],
                type: object,
              },
              timestamp: {
                description: When the event happened, ISO 8601 in UTC with second precision.,
                examples: [
                  2026-11-02T10:00:00Z,
                ],
                format: date-time,
                pattern: ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$,
                type: string,
              },
              version: {
                const: 1,
                description: Envelope version. Backwards-incompatible changes to the event shape introduce a new version.,
                type: number,
              },
            },
            required: [
              version,
              id,
              timestamp,
              eventType,
              organization,
              actor,
              metadata,
            ],
            title: Audit log event (v1),
            type: object,
          },
          AuditLogEventsPage: {
            description: Response of \`GET /audit-log/v1/events\`.,
            properties: {
              cursorExpired: {
                description: The requested cursor was older than the retention period; events right after it may be missing.,
                type: boolean,
              },
              events: {
                description: Events after the requested position, oldest first, ordered by timestamp, then id.,
                items: {
                  $ref: #/$defs/AuditLogEventV1,
                },
                type: array,
              },
              hasMore: {
                description: Whether more events are available right now. When false, poll again later with \`nextCursor\`.,
                type: boolean,
              },
              nextCursor: {
                description: Opaque cursor; pass it as \`cursor\` to read on. Present on every page, including empty ones, so clients can always store it.,
                type: string,
              },
            },
            required: [
              events,
              nextCursor,
              hasMore,
              cursorExpired,
            ],
            title: Audit log events page,
            type: object,
          },
        },
        $ref: #/$defs/AuditLogEventsPage,
        $schema: https://json-schema.org/draft/2020-12/schema,
      },
    }
  `);
});
