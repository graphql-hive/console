import { button, email, mjml, paragraph } from './components';

const numberFormatter = new Intl.NumberFormat();

export function renderRateLimitExceededEmail(input: {
  organizationName: string;
  limit: number;
  currentUsage: number;
  subscriptionManagementLink: string;
}) {
  return email({
    title: 'Rate Limit Reached',
    body: mjml`
      ${paragraph(
        mjml`Your Hive organization <strong>${
          input.organizationName
        }</strong> has reached over 100% of the operations limit quota.. Used ${numberFormatter.format(input.currentUsage)} of ${numberFormatter.format(
          input.limit,
        )}.`,
      )}
      ${paragraph(`We recommend to increase the limit.`)}
      ${button({ url: input.subscriptionManagementLink, text: 'Manage your subscription' })}
    `,
  });
}
