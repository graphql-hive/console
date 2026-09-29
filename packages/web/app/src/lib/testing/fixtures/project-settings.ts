import { SLUGS } from './layouts';

type ProjectPermissions = {
  viewerCanModifySettings: boolean;
  viewerCanManageProjectAccessTokens: boolean;
  viewerCanDelete: boolean;
};

/** `ProjectSettingsPageQuery` for a viewer with every permission; ids match the layout fixtures. */
export function projectSettings(
  overrides: Partial<ProjectPermissions> & { projectType?: 'FEDERATION' | 'SINGLE' } = {},
) {
  const { projectType = 'FEDERATION', ...permissions } = overrides;
  return {
    isGitHubIntegrationFeatureEnabled: false,
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      project: {
        __typename: 'Project' as const,
        id: 'project-1',
        slug: SLUGS.projectSlug,
        type: projectType,
        isProjectNameInGitHubCheckEnabled: false,
        isNativeFederationEnabled: true,
        experimental_nativeCompositionPerTarget: false,
        externalSchemaComposition: null,
        targets: { __typename: 'TargetConnection' as const, edges: [] },
        schemaPolicy: null,
        parentSchemaPolicy: null,
        viewerCanModifySchemaPolicy: true,
        viewerCanModifySettings: true,
        viewerCanManageProjectAccessTokens: true,
        viewerCanDelete: true,
        ...permissions,
      },
    },
  };
}
