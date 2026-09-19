import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const confirmSCIMManagementForMember: NonNullable<
  MutationResolvers['confirmSCIMManagementForMember']
> = async (_, { input }, { injector }) => {
  return injector.get(OrganizationManager).confirmSCIMManagementForMember({
    organization: input.organization,
    userId: input.member.byId,
  });
};
