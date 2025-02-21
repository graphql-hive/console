import { mjml } from '../mjml';

const numberFormatter = new Intl.NumberFormat();

export function renderRateLimitExceededEmail(input: {
  organizationName: string;
  limit: number;
  currentUsage: number;
  subscriptionManagementLink: string;
}) {
  return mjml`
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
            <mj-divider border-color="#ca8a04"></mj-divider>
            <mj-text>
              Your Hive organization <strong>${
                input.organizationName
              }</strong> has reached over 100% of the operations limit quota.
              Used ${numberFormatter.format(input.currentUsage)} of ${numberFormatter.format(
                input.limit,
              )}.
            </mj-text>.
            <mj-text>
              We recommend to increase the limit.
            </mj-text>
            <mj-button href="${mjml.raw(input.subscriptionManagementLink)}">
              Manage your subscription
            </mj-button>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `.content;
}
