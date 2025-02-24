import { button, email, mjml, paragraph } from './components';

const numberFormatter = new Intl.NumberFormat();

export function renderRateLimitWarningEmail(input: {
  organizationName: string;
  limit: number;
  currentUsage: number;
  subscriptionManagementLink: string;
}) {
  return email({
    title: 'Approaching Rate Limit',
    body: mjml`
      ${paragraph(
        mjml`Your Hive organization <strong>${
          input.organizationName
        }</strong> is approaching its operations limit quota. Used ${numberFormatter.format(input.currentUsage)} of ${numberFormatter.format(
          input.limit,
        )}.`,
      )}
      ${paragraph(`We recommend to increase the limit.`)}
      ${button({ url: input.subscriptionManagementLink, text: 'Manage your subscription' })}
    `,
  });
}
