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
      allOrganizations.map(async organization => ({
        organization,
        oidcIntegration: await oidcManager.getOIDCIntegrationForOrganization({
          organizationId: organization.id,
          skipAccessCheck: true,
        }),
      })),
    ).then(arr => arr.filter(v => v != null));

    const getPriority = (org: (typeof orgsWithOIDCConfig)[number]) => {
      // prioritize user's own organization
      if (org.organization.ownerId === actor.user.id) {
        return 2;
      }
      if (actor.oidcIntegrationId) {
        // prioritize OIDC connected organization when user is authenticated with SSO
        if (org.oidcIntegration?.id === actor.oidcIntegrationId) {
          return 1;
        }
      } else if (org.oidcIntegration?.oidcUserAccessOnly) {
        // deprioritize OIDC forced organizations when user is not authenticated with SSO
        return 4;
      }
      return 3;
    };
    const selectedOrg = orgsWithOIDCConfig.toSorted((a, b) => getPriority(a) - getPriority(b))[0];
    if (selectedOrg) {
      return {
        selector: {
          organizationSlug: selectedOrg.organization.slug,
        },
        organization: selectedOrg.organization,
      };
    }
  }

  return null;
};
