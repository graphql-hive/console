import { z } from 'zod';
import { defineTask, implementTask } from '../kit.js';
import { renderAuditLogsReportEmail } from '../lib/emails/templates/audit-logs-report.js';

export const AuditLogExportTask = defineTask({
  name: 'auditLogExport',
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
  // TODO: export audit log and store it
  await args.context.email.send({
    to: args.input.email,
    subject: 'Hive - Audit Log Report',
    body: renderAuditLogsReportEmail({
      url: args.input.url,
      organizationName: args.input.organizationName,
      formattedStartDate: args.input.formattedStartDate,
      formattedEndDate: args.input.formattedEndDate,
    }),
  });
});
