import { z } from 'zod';
import { renderAuditLogsReportEmail } from '../lib/emails/templates/audit-logs-report.js';
import { defineTask, implementTask } from '../postgraphile-kit.js';

export const AuditLogExportTask = defineTask({
  name: 'audit-log-export',
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
