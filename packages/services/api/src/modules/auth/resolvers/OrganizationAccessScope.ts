import { OrganizationAccessScope as OrganizationAccessScopeEnum } from '../providers/scopes';
import type { OrganizationAccessScopeResolvers } from './../../../__generated__/types';

export const OrganizationAccessScope: OrganizationAccessScopeResolvers = {
  READ: OrganizationAccessScopeEnum.READ,
  DELETE: OrganizationAccessScopeEnum.DELETE,
  MEMBERS: OrganizationAccessScopeEnum.MEMBERS,
  SETTINGS: OrganizationAccessScopeEnum.SETTINGS,
  INTEGRATIONS: OrganizationAccessScopeEnum.INTEGRATIONS,
};
