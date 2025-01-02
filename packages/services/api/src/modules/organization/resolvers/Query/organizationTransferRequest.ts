import { IdTranslator } from '../../../shared/providers/id-translator';
import { OrganizationManager } from '../../providers/organization-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const organizationTransferRequest: NonNullable<
  QueryResolvers['organizationTransferRequest']
> = async (_, { selector }, { injector }) => {
  const organizationId = await injector.get(IdTranslator).translateOrganizationId(selector);
  const organizationManager = injector.get(OrganizationManager);

  const transferRequest = await organizationManager.getOwnershipTransferRequest({
    organizationId: organizationId,
    code: selector.code,
  });

  if (!transferRequest) {
    return null;
  }

  return {
    organization: await organizationManager.getOrganization({
      organizationId: organizationId,
    }),
  };
};
