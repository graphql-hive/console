import { button, email, mjml, paragraph } from './components';

export function renderAuditLogsReportEmail(input: {
  organizationName: string;
  formattedStartDate: string;
  formattedEndDate: string;
  url: string;
}) {
  return email({
    title: 'Your Requested Audit Logs Are Ready',
    body: mjml`
      ${paragraph(`You requested audit logs for ${input.formattedStartDate} – ${input.formattedEndDate}, and they are now ready for download.`)}
      ${paragraph('Click the link below to download your CSV file:')}
      ${button({ url: input.url, text: 'Download Audit Logs' })}
      ${paragraph(`If you didn't request this, please contact support@graphql-hive.com.`)}
    `,
  });
}
