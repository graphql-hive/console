import { SLUGS } from './layouts';

type OrganizationPermissions = {
  viewerCanAccessSettings: boolean;
  viewerCanManageAccessTokens: boolean;
  viewerCanManageOIDCIntegration: boolean;
  viewerCanManagePersonalAccessTokens: boolean;
};

/** `OrganizationSettingsPageQuery` for a viewer with every permission; ids match the layout fixtures. */
export function organizationSettings(overrides: Partial<OrganizationPermissions> = {}) {
  return {
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      viewerCanAccessSettings: true,
      viewerCanManageAccessTokens: true,
      viewerCanManageOIDCIntegration: true,
      viewerCanManagePersonalAccessTokens: true,
      viewerCanDelete: true,
      viewerCanExportAuditLogs: true,
      viewerCanModifyGitHubIntegration: true,
      viewerCanModifySlackIntegration: true,
      viewerCanModifySlug: true,
      viewerCanTransferOwnership: true,
      viewerCanModifySchemaPolicy: true,
      hasGitHubIntegration: false,
      hasSlackIntegration: false,
      schemaPolicy: null,
      ...overrides,
    },
  };
}
