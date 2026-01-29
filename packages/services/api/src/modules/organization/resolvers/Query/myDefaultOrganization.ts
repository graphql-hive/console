import { Session } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { OrganizationManager } from '../../providers/organization-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const myDefaultOrganization: NonNullable<QueryResolvers['myDefaultOrganization']> = async (
  _,
  { previouslyVisitedOrganizationId: previouslyVisitedOrganizationSlug },
  { injector },
) => {
  const user = await injector.get(Session).getViewer();
  const organizationManager = injector.get(OrganizationManager);

  // This is the organization that got stored as an cookie
  // We make sure it actually exists before directing to it.
  if (previouslyVisitedOrganizationSlug) {
    const orgId = await injector.get(IdTranslator).translateOrganizationIdSafe({
      organizationSlug: previouslyVisitedOrganizationSlug,
    });

    if (orgId) {
      const organization = await organizationManager.getOrganizationOrNull(orgId);

      if (organization) {
        return {
          selector: {
            organizationSlug: organization.slug,
          },
          organization,
        };
      }
    }
  }

  if (user?.id) {
    const allOrganizations = await organizationManager.getOrganizations();

    if (allOrganizations.length > 0) {
      const firstOrg = allOrganizations[0];

      return {
        selector: {
          organizationSlug: firstOrg.slug,
        },
        organization: firstOrg,
      };
    }
  }

  return null;
};
