import type { Permission } from '../../auth/lib/authz';

export type PermissionRecord = {
  id: Permission;
  title: string;
  description: string;
  dependsOn?: Permission;
  isReadOnly?: true;
  warning?: string;
  isAssignableByViewer?: boolean;
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
