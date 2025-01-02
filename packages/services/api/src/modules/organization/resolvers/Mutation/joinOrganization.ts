import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const joinOrganization: NonNullable<MutationResolvers['joinOrganization']> = async (
  _,
  { code },
  { injector },
) => {
  const organization = await injector.get(OrganizationManager).joinOrganization({ code });

  if ('message' in organization) {
    return organization;
  }

  return {
    __typename: 'OrganizationPayload',
    selector: {
      organizationSlug: organization.slug,
    },
    organization,
  };
};
