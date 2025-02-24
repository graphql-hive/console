import { button, email, mjml, paragraph } from './components';

export function renderOrganizationInvitation(input: { organizationName: string; link: string }) {
  return email({
    title: `Join ${input.organizationName}`,
    body: mjml`
      ${paragraph(mjml`You've been invited to join ${input.organizationName} on GraphQL Hive.`)}
      ${button({ url: input.link, text: 'Accept the invitation' })}
    `,
  });
}
