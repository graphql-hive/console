import { stringify } from 'csv-stringify';
import { GraphQLError } from 'graphql';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { captureException } from '@sentry/node';
import { Session } from '../../auth/lib/authz';
import { AuthManager } from '../../auth/providers/auth-manager';
import { ClickHouse, sql } from '../../operations/providers/clickhouse-client';
import { SqlValue } from '../../operations/providers/sql';
import { Emails, mjml } from '../../shared/providers/emails';
import { Logger } from '../../shared/providers/logger';
import { S3_CONFIG, type S3Config } from '../../shared/providers/s3-config';
import { auditLogSchema } from './audit-logs-types';

const auditLogEventTypes = auditLogSchema.options.map(option => option.shape.eventType.value);

export const AuditLogClickhouseObjectModel = z.object({
  id: z.string(),
  timestamp: z.string(),
  organization_id: z.string(),
  event_action: z.enum(auditLogEventTypes as [string, ...string[]]),
  user_id: z.string(),
  user_email: z.string(),
  metadata: z.string().transform(x => JSON.parse(x)),
});

export type AuditLogType = z.infer<typeof AuditLogClickhouseObjectModel>;

const AuditLogClickhouseArrayModel = z.array(AuditLogClickhouseObjectModel);

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
    @Inject(S3_CONFIG) private s3Config: S3Config,
    private emailProvider: Emails,
    private session: Session,
    private auth: AuthManager,
  ) {
    this.logger = logger.child({ source: 'AuditLogManager' });
  }

  async getPaginatedAuditLogs(
    organizationSlug: string,
    pagination?: { first: number; after: number },
    filter?: { startDate?: Date; endDate?: Date },
  ): Promise<{ data: AuditLogType[] }> {
    this.logger.info(
      'Getting audit logs (organizationId=%s, filter=%o, pagination=%o)',
      organizationSlug,
      filter,
      pagination,
    );

    const isOwner = await this.auth.isOwnerOfOrganization({
      organization: organizationSlug,
    });
    if (!isOwner) {
      throw new GraphQLError('Unauthorized: You are not authorized to perform this action');
    }

    const sqlFirst = sql.raw(String(pagination?.first ?? 25));
    const sqlAfter = sql.raw(String(pagination?.after ?? 0));

    const where: SqlValue[] = [];
    where.push(sql`organization_id = ${organizationSlug}`);

    if (filter?.startDate && filter?.endDate) {
      const from = this.formatToClickhouseDateTime(filter.startDate.toISOString());
      const to = this.formatToClickhouseDateTime(filter.endDate.toISOString());
      where.push(sql`timestamp >= ${from} AND timestamp <= ${to}`);
    }
    const whereClause = where.length > 0 ? sql`WHERE ${sql.join(where, ' AND ')}` : sql``;

    const result = await this.clickHouse.query({
      query: sql`
        SELECT *
        FROM audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${sqlFirst}
        OFFSET ${sqlAfter}
      `,
      queryId: 'get-audit-logs',
      timeout: 10000,
    });

    const data = AuditLogClickhouseArrayModel.parse(result.data);

    return {
      data,
    };
  }

  async exportAndSendEmail(
    organizationSlug: string,
    filter: { startDate?: Date | null; endDate?: Date | null },
  ): Promise<{ ok: { url: string } | null } | { error?: { message: string } | null }> {
    const isOwner = await this.auth.isOwnerOfOrganization({
      organization: organizationSlug,
    });
    if (!isOwner) {
      return {
        error: {
          message: 'Unauthorized: You are not authorized to perform this action',
        },
        ok: null,
      };
    }

    const formattedStartDate = filter?.startDate ? new Date(filter.startDate) : undefined;
    const formattedEndDate = filter?.endDate ? new Date(filter.endDate) : undefined;

    try {
      const { email } = await this.session.getViewer();
      const getAllAuditLogs = await this.getPaginatedAuditLogs(
        organizationSlug,
        { first: 1000, after: 0 },
        { startDate: formattedStartDate, endDate: formattedEndDate },
      );

      if (!getAllAuditLogs || !getAllAuditLogs.data || getAllAuditLogs.data.length === 0) {
        return {
          ok: null,
          error: {
            message: 'No audit logs found for the given organization',
          },
        };
      }

      const data = getAllAuditLogs.data.map(log => {
        const { id, timestamp, user_id, user_email, event_action, metadata } = log;
        const newUser = {
          id: metadata.user.id,
          email: metadata.user.email,
          provider: metadata.user.provider,
          fullName: metadata.user.fullName,
          displayName: metadata.user.displayName,
        };
        delete metadata.user;
        const newMetadata = {
          ...newUser,
          ...metadata,
        };
        return {
          ID: id,
          Type: event_action,
          CreatedAt: timestamp,
          UserID: user_id,
          UserEmail: user_email,
          Metadata: JSON.stringify(newMetadata),
        };
      });

      const columns = ['ID', 'Type', 'CreatedAt', 'UserID', 'UserEmail', 'Metadata'];
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      const customHeader = [
        [`Hive Audit Logs for Organization: ${organizationSlug}`],
        [`Date: ${currentDate}`],
        [`Time: ${currentTime}`],
        [`User: ${email}`],
        [''], // Blank row
        [''], // Another blank row to separate sections
      ];

      const csvData = await new Promise<string>((resolve, reject) => {
        stringify(
          data,
          {
            header: true,
            columns,
          },
          (err, output) => {
            if (err) {
              reject(err);
            } else {
              const csv = customHeader.join('\n') + '\n' + output;
              resolve(csv);
            }
          },
        );
      });

      const s3Storage = this.s3Config[0];
      const { endpoint, bucket, client } = s3Storage;
      const cleanStartDate = formattedStartDate?.toISOString().split('T')[0];
      const cleanEndDate = formattedEndDate?.toISOString().split('T')[0];
      const key = `audit-logs/${organizationSlug}/${cleanStartDate}-${cleanEndDate}.csv`;
      const uploadResult = await client.fetch([endpoint, bucket, key].join('/'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: csvData,
      });

      if (!uploadResult.ok) {
        return {
          ok: null,
          error: {
            message: 'Failed to upload the file',
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
        return {
          ok: null,
          error: {
            message: 'Failed to get the pre-signed URL',
          },
        };
      }

      await this.emailProvider.schedule({
        email: email,
        subject: 'HIVE: Audit Logs are ready to download',
        body: mjml`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
                    <mj-divider border-color="#ca8a04"></mj-divider>
                    <mj-text>
                      Audit Logs for your organization are ready to download.
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
        error: null,
      };
    } catch (error) {
      this.logger.error(`Failed to export and send audit logs: ${error}`);
      captureException(error, {
        extra: {
          organizationSlug,
          filter,
        },
      });
      return {
        ok: null,
        error: {
          message: 'Failed to export and send audit logs',
        },
      };
    }
  }

  private formatToClickhouseDateTime(date: string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
}
