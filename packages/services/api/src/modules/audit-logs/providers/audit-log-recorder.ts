import { randomUUID } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import { captureException } from '@sentry/node';
import { sql as c_sql, ClickHouse } from '../../operations/providers/clickhouse-client';
import { Logger } from '../../shared/providers/logger';
import { AuditLogRecordEvent, auditLogSchema, UserContextSchema } from './audit-logs-types';

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
      const { eventType, organizationId, userEmail, userId } = data;
      this.logger.debug('Creating audit log event', { eventType });

      const parsedMetadata = auditLogSchema.parse(data);
      const parsedContext = UserContextSchema.parse(data.user);
      const eventMetadata = JSON.stringify({
        ...parsedMetadata,
        ...parsedContext,
      });

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
