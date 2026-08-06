import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const confirmSCIMAccountTakeover: NonNullable<
  MutationResolvers['confirmSCIMAccountTakeover']
> = async (_, { input }, { injector }) => {
  return injector.get(OrganizationManager).confirmSCIMAccountTakeover({
    organization: input.organization,
    userId: input.member.byId,
  });
};
