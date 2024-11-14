import { randomUUID } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import { captureException } from '@sentry/node';
import { type User } from '../../../shared/entities';
import { sql as c_sql, ClickHouse } from '../../operations/providers/clickhouse-client';
import { Logger } from '../../shared/providers/logger';
import { auditLogSchema, type AuditLogSchemaEvent } from './audit-logs-types';

type AuditLogRecordEvent = AuditLogSchemaEvent & {
  metadata: {
    userId: string;
    userEmail: string;
    organizationId: string;
    user: User;
  };
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
  ) {
    this.logger = logger.child({ source: 'AuditLogRecorder' });
  }

  async record(data: AuditLogRecordEvent): Promise<void> {
    try {
      const { eventType } = data;
      const { organizationId, userEmail, userId } = data.metadata;
      this.logger.debug('Creating audit log event', { eventType });

      const parsedEvent = auditLogSchema.parse(data);
      const metadata = {
        user: data.metadata.user,
        ...parsedEvent,
      };

      const eventMetadata = JSON.stringify(metadata);
      const eventTime = new Date();
      const id = randomUUID();
      const values = [id, eventTime, organizationId, eventType, userId, userEmail, eventMetadata];

      await this.clickHouse.insert({
        query: c_sql`
              INSERT INTO "audit_logs" (
                id,
                timestamp,
                organization_id,
                event_action,
                user_id,
                user_email,
                metadata
              )
              FORMAT CSV`,
        data: [values],
        timeout: 10000,
        queryId: 'create-audit-log',
      });
    } catch (error) {
      this.logger.error('Failed to create audit log event', error);
      captureException(error, {
        extra: {
          data,
        },
      });
    }
  }
}
