import { ProjectAccessScope as ProjectAccessScopeEnum } from '../providers/scopes';
import type { ProjectAccessScopeResolvers } from './../../../__generated__/types';

export const ProjectAccessScope: ProjectAccessScopeResolvers = {
  READ: ProjectAccessScopeEnum.READ,
  DELETE: ProjectAccessScopeEnum.DELETE,
  ALERTS: ProjectAccessScopeEnum.ALERTS,
  SETTINGS: ProjectAccessScopeEnum.SETTINGS,
  OPERATIONS_STORE_READ: ProjectAccessScopeEnum.OPERATIONS_STORE_READ,
  OPERATIONS_STORE_WRITE: ProjectAccessScopeEnum.OPERATIONS_STORE_WRITE,
};
