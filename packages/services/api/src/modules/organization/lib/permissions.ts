import type { Permission } from '../../auth/lib/authz';

export type PermissionRecord = {
  id: Permission;
  title: string;
  description: string;
  dependsOn?: Permission;
  isReadOnly?: true;
  warning?: string;
};

export type PermissionGroup = {
  id: string;
  title: string;
  permissions: Array<PermissionRecord>;
};

/**
 * Utility to verify that all the permissions in one permission group are also available in the other permission group.
 */
export function assertPermissionGroupsIsSubset(
  sourceGroups: Array<PermissionGroup>,
  subsetGroups: Array<PermissionGroup>,
) {
  const permissionsInSource = new Set(
    sourceGroups.flatMap(group => group.permissions.map(permission => permission.id)),
  );
  const missing = new Array<string>();

  subsetGroups.forEach(group =>
    group.permissions.forEach(permission => {
      if (!permissionsInSource.has(permission.id)) {
        missing.push(permission.id);
      }
    }),
  );

  if (missing.length) {
    throw new Error(
      'The following permissions are missing in the main group.\n- ' + missing.join('\n- '),
    );
  }
}

/**
 * Folter down a permission group based on a set of input permissions.
 * E.g. for only showing a list of permissions to assign based on the viewers permissions.
 */
export function filterDownPermissionGroups(
  sourceGroups: Array<PermissionGroup>,
  permissions: Set<string>,
) {
  return sourceGroups
    .map(group => {
      const newPermissions = group.permissions.filter(permission => permissions.has(permission.id));

      if (newPermissions.length === group.permissions.length) {
        return group;
      }

      if (newPermissions.length === 0) {
        return null;
      }

      return {
        ...group,
        permissions: newPermissions,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}
