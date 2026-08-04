import { button, email, mjml, paragraph } from '../components.js';

export function renderOrganizationInvitation(input: { organizationName: string; link: string }) {
  return email({
    title: `Join ${input.organizationName}`,
    body: mjml`
      ${paragraph(mjml`You've been invited to join ${input.organizationName} on Hive Console.`)}
      ${button({ url: input.link, text: 'Accept the invitation' })}
    `,
  });
}
