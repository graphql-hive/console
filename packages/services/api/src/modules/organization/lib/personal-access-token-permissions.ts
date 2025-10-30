import * as OrganizationMemberPermissions from './organization-member-permissions';
import { assertPermissionGroupsIsSubset, PermissionGroup } from './permissions';

export const permissionGroups: Array<PermissionGroup> = [
  {
    id: 'organization',
    title: 'Organization',
    permissions: [
      {
        id: 'organization:describe',
        title: 'Describe organization',
        description: 'Fetch information about the specified organization.',
      },
    ],
  },
  {
    id: 'project',
    title: 'Project',
    permissions: [
      {
        id: 'project:describe',
        title: 'Describe project',
        description: 'Fetch information about the specified projects.',
      },
    ],
  },
  {
    id: 'cli-actions-schema-registry',
    title: 'CLI/API Actions for Schema Registry',
    permissions: [
      {
        id: 'schema:compose',
        title: 'Compose schema',
        description: 'Allow using "hive dev" command for local composition.',
        dependsOn: 'project:describe',
      },
      {
        id: 'schemaCheck:create',
        title: 'Check schema/service/subgraph',
        description: 'Allow usage of the "hive schema:check" command.',
        dependsOn: 'project:describe',
      },
      {
        id: 'schemaVersion:publish',
        title: 'Publish schema/service/subgraph',
        description: 'Allow usage of the "hive schema:publish" command.',
        dependsOn: 'project:describe',
      },
      {
        id: 'schemaVersion:deleteService',
        title: 'Delete service',
        description: 'Allow usage of the "hive schema:delete" command.',
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    id: 'cli-actions-app-deployments',
    title: 'CLI/API Actions for App Deployments',
    permissions: [
      {
        id: 'appDeployment:create',
        title: 'Create app deployment',
        description: 'Grant access to creating app deployments.',
      },
      {
        id: 'appDeployment:publish',
        title: 'Publish app deployment',
        description: 'Grant access to publishing app deployments.',
      },
      {
        id: 'appDeployment:retire',
        title: 'Retire app deployment',
        description: 'Grant access to retring app deployments.',
      },
    ],
  },
  {
    id: 'api-actions-reporting',
    title: 'API Reporting',
    permissions: [
      {
        id: 'usage:report',
        title: 'Report usage data',
        description: 'Grant access to report usage data.',
      },
      {
        id: 'traces:report',
        title: 'Report OTEL traces',
        description: 'Grant access to reporting traces.',
      },
    ],
  },
];

/**
 * Make sure that the personal access token permissions is always a subset of the
 * organization member permissions.
 *
 * We need to do this because the organization member needs the permissions assigned in order
 * to assign them to the personal access token.
 *
 * If that is not possible we have a inconsistency.
 */
assertPermissionGroupsIsSubset(OrganizationMemberPermissions.permissionGroups, permissionGroups);
