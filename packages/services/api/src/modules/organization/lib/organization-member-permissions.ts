import { allPermissions, Permission } from '../../auth/lib/authz';
import { PermissionGroup } from './permissions';

export const permissionGroups: Array<PermissionGroup> = [
  {
    id: 'organization',
    title: 'Organization',
    permissions: [
      {
        id: 'organization:describe',
        title: 'View organization',
        description: 'Member can see the organization. Permission can not be modified.',
        isReadyOnly: true,
      },
      {
        id: 'support:manageTickets',
        title: 'Access support tickets',
        description: 'Member can access, create and reply to support tickets.',
      },
      {
        id: 'organization:modifySlug',
        title: 'Update organization slug',
        description: 'Member can modify the organization slug.',
      },
      {
        id: 'auditLog:export',
        title: 'Export audit log',
        description: 'Member can access and export the audit log.',
      },
      {
        id: 'organization:delete',
        title: 'Delete organization',
        description: 'Member can delete the Organization.',
      },
    ],
  },
  {
    id: 'members',
    title: 'Members',
    permissions: [
      {
        id: 'member:describe',
        title: 'View members',
        description: 'Member can access the organization member overview.',
      },

      {
        id: 'member:modify',
        title: 'Manage members',
        description: 'Member can invite users, update and assign roles.',
        dependsOn: 'member:describe',
        warning:
          'Granting a role the ability to manage members enables it to elevate its own permissions.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    permissions: [
      {
        id: 'billing:describe',
        title: 'View billing',
        description: 'Member can view the billing information.',
      },
      {
        id: 'billing:update',
        title: 'Update billing',
        description: 'Member can change the organization plan.',
        dependsOn: 'billing:describe',
      },
    ],
  },
  {
    id: 'oidc',
    title: 'OpenID Connect',
    permissions: [
      {
        id: 'oidc:modify',
        title: 'Manage OpenID Connect integration',
        description: 'Member can connect, modify, and remove an OIDC provider to the connection.',
      },
    ],
  },
  {
    id: 'github',
    title: 'GitHub Integration',
    permissions: [
      {
        id: 'gitHubIntegration:modify',
        title: 'Manage GitHub integration',
        description:
          'Member can connect, modify, and remove access for the GitHub integration and repository access.',
      },
    ],
  },
  {
    id: 'slack',
    title: 'Slack Integration',
    permissions: [
      {
        id: 'slackIntegration:modify',
        title: 'Manage Slack integration',
        description:
          'Member can connect, modify, and remove access for the Slack integration and repository access.',
      },
    ],
  },
  {
    id: 'project',
    title: 'Project',
    permissions: [
      {
        id: 'project:create',
        title: 'Create project',
        description: 'Member can create new projects.',
      },
      {
        id: 'project:describe',
        title: 'View project',
        description: 'Member can access the specified projects.',
      },
      {
        id: 'project:delete',
        title: 'Delete project',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
      },
      {
        id: 'project:modifySettings',
        title: 'Modify Settings',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    id: 'schema-linting',
    title: 'Schema Linting',
    permissions: [
      {
        id: 'schemaLinting:modifyOrganizationRules',
        title: 'Manage organization level schema linting',
        description: 'Member can view and modify the organization schema linting rules.',
      },
      {
        id: 'schemaLinting:modifyProjectRules',
        title: 'Manage project level schema linting',
        description: 'Member can view and modify the projects schema linting rules.',
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
        description: 'Member can create new projects.',
        dependsOn: 'project:describe',
      },
      {
        id: 'target:delete',
        title: 'Delete target',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
      },
      {
        id: 'target:modifySettings',
        title: 'Modify settings',
        description: 'Member can access the specified projects.',
        dependsOn: 'project:describe',
      },
      {
        id: 'alert:modify',
        title: 'Modify alerts',
        description: 'Can create alerts for schema versions.',
        dependsOn: 'project:describe',
      },
      {
        id: 'targetAccessToken:modify',
        title: 'Manage registry access tokens',
        description: 'Allow managing access tokens for CLI and Usage Reporting.',
        dependsOn: 'project:describe',
      },
      {
        id: 'cdnAccessToken:modify',
        title: 'Manage CDN access tokens',
        description: 'Allow managing access tokens for the CDN.',
        dependsOn: 'project:describe',
      },
    ],
  },
  {
    id: 'laboratory',
    title: 'Laboratory',
    permissions: [
      {
        id: 'laboratory:describe',
        title: 'View laboratory',
        description: 'Member can access the laboratory, view and execute GraphQL documents.',
        dependsOn: 'project:describe',
      },
      {
        id: 'laboratory:modify',
        title: 'Modify laboratory',
        description:
          'Member can create, delete and update collections and documents in the laboratory.',
        dependsOn: 'laboratory:describe',
      },
      {
        id: 'laboratory:modifyPreflightScript',
        title: 'Modify the laboratory preflight script',
        description: 'Member can update the laboratory preflight script.',
        dependsOn: 'laboratory:describe',
      },
    ],
  },
  {
    id: 'schema-checks',
    title: 'Schema Checks',
    permissions: [
      {
        id: 'schemaCheck:approve',
        title: 'Approve schema check',
        description: 'Member can approve failed schema checks.',
        dependsOn: 'project:describe',
      },
    ],
  },
] as const;

function assertAllRulesAreAssigned(excluded: Array<Permission>) {
  const permissionsToCheck = new Set(allPermissions);

  for (const item of excluded) {
    permissionsToCheck.delete(item);
  }

  for (const group of permissionGroups) {
    for (const permission of group.permissions) {
      permissionsToCheck.delete(permission.id);
    }
  }

  if (permissionsToCheck.size) {
    throw new Error(
      'The following permissions are not assigned: \n' + Array.from(permissionsToCheck).join(`\n`),
    );
  }
}

/**
 * This seems like the easiest way to make sure that all the permissions we have are
 * assignable and exposed via our API.
 */
assertAllRulesAreAssigned([
  /** These are CLI only actions for now. */
  'schema:compose',
  'schemaCheck:create',
  'schemaVersion:publish',
  'schemaVersion:deleteService',
  'appDeployment:create',
  'appDeployment:publish',
  'appDeployment:retire',

  'accessToken:modify',
]);

/**
 * List of permissions that are assignable
 */
export const permissions = (() => {
  const assignable = new Set<Permission>();
  const readOnly = new Set<Permission>();
  for (const group of permissionGroups) {
    for (const permission of group.permissions) {
      if (permission.isReadyOnly === true) {
        readOnly.add(permission.id);
        continue;
      }
      assignable.add(permission.id);
    }
  }

  return {
    /**
     * List of permissions that are assignable by the user (these should be stored in the database)
     */
    assignable: assignable as ReadonlySet<Permission>,
    /**
     * List of permissions that are assigned by default (these do not need to be stored in the database)
     */
    default: readOnly as ReadonlySet<Permission>,
  };
})();
