import type { User } from '../../shared/entities';
import { PermissionGroup, PermissionRecord } from '../organization/lib/permissions';
import type {
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from './providers/scopes';

export type OrganizationAccessScopeMapper = OrganizationAccessScope;
export type ProjectAccessScopeMapper = ProjectAccessScope;
export type TargetAccessScopeMapper = TargetAccessScope;
export type UserConnectionMapper = readonly User[];
export type UserMapper = User;
export type PermissionGroupMapper = PermissionGroup;
export type PermissionMapper = PermissionRecord;
