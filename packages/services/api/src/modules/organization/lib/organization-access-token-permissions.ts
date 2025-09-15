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
    ],
  },
  {
    id: 'members',
    title: 'Members',
    permissions: [
      {
        id: 'member:describe',
        title: 'Describe members',
        description: 'Fetch information about organization members.',
      },

      {
        id: 'member:modify',
        title: 'Manage members',
        description: 'Manage users, roles, and invites.',
        dependsOn: 'member:describe',
      },
    ],
  },
  {
    id: 'access-tokens',
    title: 'Access Tokens',
    permissions: [
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
      {
        id: 'project:create',
        title: 'Create project',
        description: 'Create new projects.',
      },
      {
        id: 'project:delete',
        title: 'Delete project',
        description: 'Delete projects.',
        dependsOn: 'project:describe',
      },
      {
        id: 'project:modifySettings',
        title: 'Modify Settings',
        description: 'Modify the project settings.',
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    id: 'target',
    title: 'Target',
    permissions: [
      {
        id: 'target:create',
        title: 'Create target',
        description: 'Create new targets.',
      },
      {
        id: 'target:delete',
        title: 'Delete target',
        description: 'Delete targets',
      },
      {
        id: 'target:modifySettings',
        title: 'Modify settings',
        description:
          'Member can modify settings such as the conditional breaking change configuration.',
      },
      {
        id: 'cdnAccessToken:modify',
        title: 'Manage CDN access tokens',
        description: 'Allow managing access tokens for the CDN.',
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
