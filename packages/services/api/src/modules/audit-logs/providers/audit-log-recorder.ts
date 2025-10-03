import { randomUUID } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import { captureException } from '@sentry/node';
import { Session } from '../../auth/lib/authz';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { Logger } from '../../shared/providers/logger';
import { AuditLogModel, AuditLogSchemaEvent } from './audit-logs-types';

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
  ) {
    this.logger = logger.child({ source: 'AuditLogRecorder' });
  }

  async record(data: AuditLogSchemaEvent & { organizationId: string }): Promise<void> {
    try {
      const actor = await this.session.getActor();
      const { eventType, organizationId } = data;
      this.logger.debug(
        'Creating audit log event (eventType=%s, actorType=%s)',
        eventType,
        actor.type,
      );

      const user =
        actor.type === 'user'
          ? {
              id: actor.user.id,
              email: actor.user.email,
              fullName: actor.user.fullName,
              displayName: actor.user.displayName,
              provider: actor.user.provider,
            }
          : undefined;
      const accessToken =
        actor.type === 'organizationAccessToken'
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

      const eventTime = formatToClickhouseDateTime(new Date());
      const id = randomUUID();

      await this.clickHouse.postQuery({
        query: sql`
          INSERT INTO "audit_logs" (
            "id"
            , "timestamp"
            , "organization_id"
            , "event_action"
            , "user_id"
            , "user_email"
            , "access_token_id"
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
            , ${JSON.stringify(eventMetadata)}
          )
        `,
        timeout: 10000,
        queryId: 'create-audit-log',
      });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.toString()
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.logger.error('Failed to create audit log event (error=%s)', errorText);
      captureException(error, {
        extra: {
          data,
        },
      });
    }
  }
}

export function formatToClickhouseDateTime(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
