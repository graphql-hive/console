import { randomUUID } from 'node:crypto';
import { CONTEXT, Inject, Injectable, Scope } from 'graphql-modules';
import { formatDateTime } from '@hive/clickhouse';
import type { FastifyRequest } from '@hive/service-common';
import { captureException } from '@sentry/node';
import { resolveClientIP } from '../../../shared/resolve-client-ip';
import type { Actor } from '../../auth/lib/authz';
import { Session } from '../../auth/lib/authz';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { Logger } from '../../shared/providers/logger';
import { ClientIPHeaderName } from '../../shared/providers/tokens';
import { AuditLogModel, AuditLogSchemaEvent } from './audit-logs-types';

/** The client (e.g. browser or CLI) that triggered the audit log event. */
export type AuditLogClient = {
  ipAddress: string;
  userAgent: string | null;
};

@Injectable({
  scope: Scope.Operation,
  global: true,
})
/**
 * Responsible for recording audit log events and storing them in ClickHouse
 */
export class AuditLogRecorder {
  private logger: Logger;

  constructor(
    logger: Logger,
    private clickHouse: ClickHouse,
    private session: Session,
    @Inject(CONTEXT) private context: Pick<GraphQLModules.ModuleContext, 'req'>,
    private clientIPHeaderName: ClientIPHeaderName,
  ) {
    this.logger = logger.child({ source: 'AuditLogRecorder' });
  }

  /** Resolve the client information (IP address, user agent) of a request. */
  static resolveClient(req: FastifyRequest, clientIPHeaderName: string | null): AuditLogClient {
    const userAgent = req.headers['user-agent'];
    return {
      ipAddress: resolveClientIP(req, clientIPHeaderName),
      userAgent: typeof userAgent === 'string' ? userAgent : null,
    };
  }

  async record(data: AuditLogSchemaEvent & { organizationId: string }): Promise<void> {
    let actor: Actor;
    try {
      actor = await this.session.getActor();
    } catch (error) {
      AuditLogRecorder.reportError(this.logger, error, data);
      return;
    }

    await AuditLogRecorder.record(
      {
        logger: this.logger,
        clickHouse: this.clickHouse,
      },
      actor,
      data,
      AuditLogRecorder.resolveClient(this.context.req, this.clientIPHeaderName.headerName),
    );
  }

  /**
   * Record an audit log event for an explicitly provided actor and client.
   *
   * Use this outside of a GraphQL operation (e.g. the authentication endpoints), where no `Session`
   * is available. Pass `null` as the actor for unauthenticated events (e.g. a failed sign in attempt),
   * and `null` as the client for events not caused by a request (e.g. background jobs).
   */
  static async record(
    deps: {
      logger: Logger;
      clickHouse: ClickHouse;
    },
    actor: Actor | null,
    data: AuditLogSchemaEvent & { organizationId: string },
    client: AuditLogClient | null,
  ): Promise<void> {
    try {
      const { eventType, organizationId } = data;
      deps.logger.debug(
        'Creating audit log event (eventType=%s, actorType=%s)',
        eventType,
        actor?.type ?? 'anonymous',
      );

      const user =
        actor?.type === 'user'
          ? {
              id: actor.user.id,
              email: actor.user.email,
              fullName: actor.user.fullName,
              displayName: actor.user.displayName,
            }
          : undefined;

      const accessToken =
        actor?.type === 'organizationAccessToken'
          ? {
              id: actor.organizationAccessToken.id,
              firstCharacters: actor.organizationAccessToken.firstCharacters,
            }
          : undefined;

      const auditLog = AuditLogModel.parse(data);
      const eventMetadata = {
        ...('metadata' in auditLog ? (auditLog.metadata as Record<string, unknown>) : {}),
        user,
        accessToken,
      };

      const eventTime = formatDateTime(new Date());
      const id = randomUUID();

      await deps.clickHouse.postQuery({
        query: sql`
          INSERT INTO "audit_logs" (
            "id"
            , "timestamp"
            , "organization_id"
            , "event_action"
            , "user_id"
            , "user_email"
            , "access_token_id"
            , "ip_address"
            , "user_agent"
            , "metadata"
          )
          VALUES (
            ${id}
            , ${eventTime}
            , ${organizationId}
            , ${eventType}
            , ${user?.id ?? ''}
            , ${user?.email ?? ''}
            , ${accessToken?.id ?? ''}
            , ${client?.ipAddress ?? ''}
            , ${client?.userAgent ?? ''}
            , ${JSON.stringify(eventMetadata)}
          )
        `,
        timeout: 10000,
        queryId: 'create-audit-log',
      });
    } catch (error) {
      AuditLogRecorder.reportError(deps.logger, error, data);
    }
  }

  private static reportError(logger: Logger, error: unknown, data: unknown) {
    const errorText =
      error instanceof Error
        ? error.toString()
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    logger.error('Failed to create audit log event (error=%s)', errorText);
    captureException(error, {
      extra: {
        data,
      },
    });
  }
}
