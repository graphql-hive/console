import { OrganizationManager } from '../../providers/organization-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const organizationBySlug: NonNullable<QueryResolvers['organizationBySlug']> = async (
  _parent,
  args,
  { injector },
) => {
  return injector.get(OrganizationManager).getOrganizationBySlug(args.organizationSlug);
};
