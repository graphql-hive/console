import { type PermissionGroup } from './permissions';

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
      {
        id: 'accessToken:modify',
        title: 'Manage access tokens',
        description: 'Fetch, create and delete access tokens.',
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
    id: 'usage-reporting',
    title: 'Usage Reporting',
    permissions: [
      {
        id: 'usage:report',
        title: 'Report usage data',
        description: 'Grant access to report usage data.',
      },
    ],
  },
  {
    id: 'services',
    title: 'Schema Registry',
    permissions: [
      {
        id: 'schemaCheck:create',
        title: 'Check schema/service/subgraph',
        description: 'Grant access to publish services/schemas.',
      },
      {
        id: 'schemaVersion:publish',
        title: 'Publish schema/service/subgraph',
        description: 'Grant access to publish services/schemas.',
      },
      {
        id: 'schemaVersion:deleteService',
        title: 'Delete service',
        description: 'Deletes a service from the schema registry.',
      },
    ],
  },
  {
    id: 'app-deployments',
    title: 'App Deployments',
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
    ],
  },
];

export const assignablePermissions = new Set(
  permissionGroups.flatMap(group => group.permissions.map(permission => permission.id)),
);
