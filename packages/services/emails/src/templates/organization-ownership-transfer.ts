import { mjml } from '../mjml';

export function renderOrganizationOwnershipTransferEmail(input: {
  authorName: string;
  organizationName: string;
  link: string;
}) {
  return mjml`
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
            <mj-divider border-color="#ca8a04"></mj-divider>
            <mj-text>
              ${input.authorName} wants to transfer the ownership of the <strong>${input.organizationName}</strong> organization.
            </mj-text>
            <mj-button href="${mjml.raw(input.link)}">
              Accept the transfer
            </mj-button>
            <mj-text align="center">
              This link will expire in a day.
            </mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>
  `.content;
}
