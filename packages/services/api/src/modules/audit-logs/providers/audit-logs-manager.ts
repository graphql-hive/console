import { stringify } from 'csv-stringify';
import { endOfDay, startOfDay } from 'date-fns';
import { Injectable, Scope } from 'graphql-modules';
import { traceFn } from '@hive/service-common';
import { captureException } from '@sentry/node';
import { Session } from '../../auth/lib/authz';
import { type AwsClient } from '../../cdn/providers/aws';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { Emails, mjml } from '../../shared/providers/emails';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import { formatToClickhouseDateTime } from './audit-log-recorder';
import { AuditLogClickhouseArrayModel } from './audit-logs-types';

export class AuditLogS3Config {
  constructor(
    public client: AwsClient,
    public endpoint: string,
    public bucket: string,
  ) {}
}

@Injectable({
  scope: Scope.Operation,
})
/**
 * Responsible for accessing audit logs.
 */
export class AuditLogManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private clickHouse: ClickHouse,
    private s3Config: AuditLogS3Config,
    private emailProvider: Emails,
    private session: Session,
    private storage: Storage,
  ) {
    this.logger = logger.child({ source: 'AuditLogManager' });
  }

  async getAuditLogsByDateRange(
    organizationId: string,
    filter: { startDate: Date; endDate: Date },
  ) {
    await this.session.assertPerformAction({
      action: 'auditLog:export',
      organizationId,
      params: {
        organizationId,
      },
    });

    this.logger.info('Getting audit logs (organizationId=%s, filter=%o)', organizationId, filter);

    const query = sql`
      SELECT
        "id"
        , "timestamp"
        , "organization_id" AS "organizationId"
        , "event_action" AS "eventAction"
        , "user_id" AS "userId"
        , "user_email" AS "userEmail"
        , "metadata"
      FROM
        "audit_logs"
      WHERE 
        "organization_id" = ${organizationId}
        AND "timestamp" >= ${formatToClickhouseDateTime(startOfDay(filter.startDate))}
        AND "timestamp" <= ${formatToClickhouseDateTime(endOfDay(filter.endDate))}
      ORDER BY
        "timestamp" DESC
        , "id" DESC
    `;

    const result = await this.clickHouse.query({
      query,
      queryId: 'get-audit-logs',
      timeout: 10000,
    });

    return AuditLogClickhouseArrayModel.parse(result.data);
  }

  @traceFn('AuditLogsManager.exportAndSendEmail', {
    initAttributes: (organizationId, filter) => ({
      'hive.organization.id': organizationId,
      'input.start-date': filter.startDate.toString(),
      'input.end-date': filter.endDate.toString(),
    }),
    resultAttributes: result => ({
      'error.message': result.error?.message,
    }),
    errorAttributes: error => ({
      'error.message': error.message,
    }),
  })
  async exportAndSendEmail(
    organizationId: string,
    filter: { startDate: Date; endDate: Date },
  ): Promise<
    | {
        ok: {
          url: string;
        };
        error?: never;
      }
    | {
        ok?: never;
        error: {
          message: string;
        };
      }
  > {
    await this.session.assertPerformAction({
      action: 'auditLog:export',
      organizationId,
      params: {
        organizationId,
      },
    });

    const getAllAuditLogs = await this.getAuditLogsByDateRange(organizationId, filter);

    if (!getAllAuditLogs || !getAllAuditLogs || getAllAuditLogs.length === 0) {
      return {
        error: {
          message: 'No audit logs found for the given date range',
        },
      };
    }

    try {
      const { email } = await this.session.getViewer();
      const csvData = await new Promise<string>((resolve, reject) => {
        stringify(
          getAllAuditLogs,
          {
            header: true,
            columns: {
              id: 'id',
              timestamp: 'created_at',
              eventAction: 'event_type',
              userId: 'user_id',
              userEmail: 'user_email',
              metadata: 'metadata',
            },
          },
          (err, output) => {
            if (err) {
              reject(err);
            } else {
              resolve(output);
            }
          },
        );
      });

      const { endpoint, bucket, client } = this.s3Config;
      const cleanStartDate = filter.startDate.toISOString().split('T')[0];
      const cleanEndDate = filter.endDate.toISOString().split('T')[0];
      const unixTimestampInSeconds = Math.floor(Date.now() / 1000);
      const key = `audit-logs/${organizationId}/${unixTimestampInSeconds}-${cleanStartDate}-${cleanEndDate}.csv`;
      const uploadResult = await client.fetch([endpoint, bucket, key].join('/'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvData,
      });

      if (!uploadResult.ok) {
        this.logger.error(`Failed to upload the file: ${uploadResult.url}`);
        captureException('Audit log: Failed to upload the file', {
          extra: {
            organizationId,
            filter,
          },
        });
        return {
          error: {
            message: 'Failed to generate the audit logs CSV',
          },
        };
      }

      const getPresignedUrl = await client.fetch([endpoint, bucket, key].join('/'), {
        method: 'GET',
        aws: {
          signQuery: true,
        },
      });

      if (!getPresignedUrl.ok) {
        this.logger.error(`Failed to get the pre-signed URL: ${getPresignedUrl.url}`);
        captureException('Audit log: Failed to get the pre-signed URL', {
          extra: {
            organizationId,
            filter,
          },
        });
        return {
          error: {
            message: 'Failed to generate the audit logs CSV',
          },
        };
      }

      const organization = await this.storage.getOrganization({
        organizationId,
      });
      const title = `Audit Logs for your organization ${organization.name} from ${cleanStartDate} to ${cleanEndDate}`;
      await this.emailProvider.schedule({
        email: email,
        subject: 'Hive - Audit Log Report',
        body: mjml`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
                    <mj-divider border-color="#ca8a04"></mj-divider>
                    <mj-text>
                      ${title}
                    </mj-text>.
                    <mj-button href="${getPresignedUrl.url}" background-color="#ca8a04">
                      Download Audit Logs CSV
                    </mj-button>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `,
      });

      return {
        ok: {
          url: getPresignedUrl.url,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to export and send audit logs: ${error}`);
      captureException(error, {
        extra: {
          organizationId,
          filter,
        },
      });
      return {
        error: {
          message: 'Failed to generate the audit logs CSV',
        },
      };
    }
  }
}
