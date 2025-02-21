import { mjml } from '../mjml';

export function renderOrganizationInvitation(input: { organizationName: string; link: string }) {
  return mjml`<mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-image width="150px" src="https://graphql-hive.com/logo.png"></mj-image>
          <mj-divider border-color="#ca8a04"></mj-divider>
          <mj-text>
            Someone from <strong>${input.organizationName}</strong> invited you to join GraphQL Hive.
          </mj-text>.
          <mj-button href="${mjml.raw(input.link)}">
            Accept the invitation
          </mj-button>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>`.content;
}
