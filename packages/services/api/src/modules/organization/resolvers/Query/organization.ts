import { OrganizationManager } from '../../providers/organization-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const organization: NonNullable<QueryResolvers['organization']> = async (
  _,
  { reference },
  { injector },
) => {
  return await injector.get(OrganizationManager).getOrganizationByReference(reference);
};
