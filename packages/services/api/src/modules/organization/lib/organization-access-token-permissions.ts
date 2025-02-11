import { type PermissionGroup } from './permissions';

export const permissionGroups: Array<PermissionGroup> = [
  {
    id: 'organization',
    title: 'Organization',
    permissions: [
      {
        id: 'organization:describe',
        title: 'View organization',
        description: 'Member can see the organization. Permission can not be modified.',
      },
    ],
  },
  {
    id: 'organization',
    title: 'Organization',
    permissions: [
      {
        id: 'project:describe',
        title: 'View project',
        description: 'Member can access the specified projects.',
      },
    ],
  },
  {
    id: 'schema-checks',
    title: 'Schema Checks',
    permissions: [
      {
        id: 'schemaCheck:create',
        title: 'Create schema checks',
        description: 'Grant access to performing schema checks.',
      },
    ],
  },
  {
    id: 'services',
    title: 'Schema Registry',
    permissions: [
      {
        id: 'schemaCheck:create',
        title: 'Publish schema/service/subgraph',
        description: 'Grant access to publish services/schemas.',
      },
      {
        id: 'schemaCheck:create',
        title: 'Delete service',
        description: 'Grant access to deleting services.',
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
