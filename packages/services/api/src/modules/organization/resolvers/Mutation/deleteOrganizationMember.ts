import { IdTranslator } from '../../../shared/providers/id-translator';
import { OrganizationManager } from '../../providers/organization-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOrganizationMember: NonNullable<
  MutationResolvers['deleteOrganizationMember']
> = async (_, { input }, { injector }) => {
  const organizationId = await injector.get(IdTranslator).translateOrganizationId(input);
  const organization = await injector
    .get(OrganizationManager)
    .deleteMember({ organizationId: organizationId, user: input.userId });

  return {
    selector: input,
    organization,
  };
};
