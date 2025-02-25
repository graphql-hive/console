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
