import { OrganizationManager } from '../../organization/providers/organization-manager';
import { OIDCIntegrationsProvider } from '../providers/oidc-integrations.provider';
import type { OidcIntegrationResolvers } from './../../../__generated__/types';

export const OIDCIntegration: OidcIntegrationResolvers = {
  id: oidcIntegration => oidcIntegration.id,
  tokenEndpoint: oidcIntegration => oidcIntegration.tokenEndpoint,
  userinfoEndpoint: oidcIntegration => oidcIntegration.userinfoEndpoint,
  authorizationEndpoint: oidcIntegration => oidcIntegration.authorizationEndpoint,
  clientId: oidcIntegration => oidcIntegration.clientId,
  clientSecretPreview: (oidcIntegration, _, { injector }) =>
    injector.get(OIDCIntegrationsProvider).getClientSecretPreview(oidcIntegration),
  /**
   * Fallbacks to Viewer if default member role is not set
   */
  defaultMemberRole: async (oidcIntegration, _, { injector }) => {
    if (!oidcIntegration.defaultMemberRoleId) {
      return injector.get(OrganizationManager).getViewerMemberRole({
        organizationId: oidcIntegration.linkedOrganizationId,
      });
    }

    const role = await injector.get(OrganizationManager).getMemberRole({
      organizationId: oidcIntegration.linkedOrganizationId,
      roleId: oidcIntegration.defaultMemberRoleId,
    });

    if (!role) {
      throw new Error(
        `Default role not found (role_id=${oidcIntegration.defaultMemberRoleId}, organization=${oidcIntegration.linkedOrganizationId})`,
      );
    }

    return role;
  },
};
