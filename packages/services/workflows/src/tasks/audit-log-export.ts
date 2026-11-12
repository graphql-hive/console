import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { EMAIL_MAX_ATTEMPTS } from '../lib/emails/retry-policy.js';
import { sendTrackedEmail } from '../lib/emails/send-tracked-email.js';
import { renderAuditLogsReportEmail } from '../lib/emails/templates/audit-logs-report.js';

export const AuditLogExportTask = defineTask({
  name: 'auditLogExport',
  maxAttempts: EMAIL_MAX_ATTEMPTS,
  schema: z.object({
    organizationId: z.string(),
    organizationName: z.string(),
    formattedStartDate: z.string(),
    formattedEndDate: z.string(),
    url: z.string(),
    email: z.string(),
  }),
});

export const task = implementTask(AuditLogExportTask, async args => {
  await sendTrackedEmail({
    context: args.context,
    helpers: args.helpers,
    logger: args.logger,
    requestId: args.requestId,
    organizationId: args.input.organizationId,
    event: 'audit_log_export',
    email: {
      to: args.input.email,
      subject: 'Hive - Audit Log Report',
      body: renderAuditLogsReportEmail({
        url: args.input.url,
        organizationName: args.input.organizationName,
        formattedStartDate: args.input.formattedStartDate,
        formattedEndDate: args.input.formattedEndDate,
      }),
    },
    // The exported period; the presigned download URL stays out of the record.
    metadata: { period: `${args.input.formattedStartDate}..${args.input.formattedEndDate}` },
  });
});
