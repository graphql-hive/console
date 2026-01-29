import { AccessError } from '../../../../shared/errors';
import { Session } from '../../../auth/lib/authz';
import { OIDCIntegrationsProvider } from '../../../oidc-integrations/providers/oidc-integrations.provider';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { OrganizationManager } from '../../providers/organization-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const myDefaultOrganization: NonNullable<QueryResolvers['myDefaultOrganization']> = async (
  _,
  { previouslyVisitedOrganizationId: previouslyVisitedOrganizationSlug },
  { injector },
) => {
  const actor = await injector.get(Session).getActor();
  if (actor.type !== 'user') {
    throw new AccessError('Only authenticated users can perform this action.');
  }
  const organizationManager = injector.get(OrganizationManager);
  const oidcManager = injector.get(OIDCIntegrationsProvider);

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

  if (actor.user?.id) {
    const allOrganizations = await organizationManager.getOrganizations();
    const orgsWithOIDCConfig = await Promise.all(
      allOrganizations.map(async org => ({
        ...org,
        oidcIntegration: await oidcManager.getOIDCIntegrationForOrganization({
          organizationId: org.id,
        }),
      })),
    ).then(arr => arr.filter(v => v != null));

    const matchingOrg = orgsWithOIDCConfig.find(org => {
      if (actor.oidcIntegrationId) {
        // select OIDC connected organization when user is authenticated with SSO
        if (org.oidcIntegration?.id === actor.oidcIntegrationId) {
          return org;
        }
      } else if (
        !org.oidcIntegration ||
        !org.oidcIntegration.oidcUserAccessOnly ||
        actor.user.id === org.ownerId
      ) {
        // avoid showing OIDC forced organizations to be shown as the default
        // when user is not authenticated with SSO
        return org;
      }
    });

    if (matchingOrg) {
      return {
        selector: {
          organizationSlug: matchingOrg.slug,
        },
        organization: matchingOrg,
      };
    }
  }

  return null;
};
