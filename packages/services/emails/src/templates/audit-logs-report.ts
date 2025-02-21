import { mjml } from '../mjml';

export function renderAuditLogsReportEmail(input: {
  organizationName: string;
  formattedStartDate: string;
  formattedEndDate: string;
  url: string;
}) {
  return mjml`
      <mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
              <mj-divider border-color="#ca8a04"></mj-divider>
              <mj-text>
                Audit Logs for your organization ${input.organizationName} from ${input.formattedStartDate} to ${input.formattedEndDate}
              </mj-text>.
              <mj-button href="${input.url}" background-color="#ca8a04">
                Download Audit Logs CSV
              </mj-button>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `.content;
}
