import { SLUGS } from './layouts';

type TargetPermissions = {
  viewerCanAccessSettings: boolean;
  viewerCanModifySettings: boolean;
  viewerCanModifyCDNAccessToken: boolean;
  viewerCanModifyTargetAccessToken: boolean;
  viewerCanDelete: boolean;
};

/** `TargetSettingsPageQuery` for a viewer with every permission; ids match the layout fixtures. */
export function targetSettings(
  overrides: Partial<TargetPermissions> & { projectType?: 'FEDERATION' | 'SINGLE' } = {},
) {
  const { projectType = 'FEDERATION', ...permissions } = overrides;
  return {
    organization: {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      isAppDeploymentsEnabled: true,
      project: {
        __typename: 'Project' as const,
        id: 'project-1',
        slug: SLUGS.projectSlug,
        type: projectType,
        target: {
          __typename: 'Target' as const,
          id: 'target-1',
          slug: SLUGS.targetSlug,
          graphqlEndpointUrl: null,
          baseSchema: null,
          viewerCanAccessSettings: true,
          viewerCanModifySettings: true,
          viewerCanModifyCDNAccessToken: true,
          viewerCanModifyTargetAccessToken: true,
          viewerCanDelete: true,
          ...permissions,
        },
      },
    },
  };
}
