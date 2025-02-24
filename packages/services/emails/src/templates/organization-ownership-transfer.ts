import { button, email, mjml, paragraph } from './components';

export function renderOrganizationOwnershipTransferEmail(input: {
  authorName: string;
  organizationName: string;
  link: string;
}) {
  return email({
    title: 'Organization Ownership Transfer Initiated',
    body: mjml`
      ${paragraph(
        `${input.authorName} wants to transfer the ownership of the <strong>${input.organizationName}</strong> organization.`,
      )}
      ${button({ url: input.link, text: 'Accept the transfer' })}
      ${paragraph(`This link will expire in a day.`)}
    `,
  });
}
