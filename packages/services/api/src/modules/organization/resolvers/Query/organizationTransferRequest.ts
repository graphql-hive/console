import { IdTranslator } from '../../../shared/providers/id-translator';
import { Storage } from '../../../shared/providers/storage';
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

  const organization = await organizationManager.getOrganization({
    organizationId: organizationId,
  });

  // The viewer is the designated recipient of the transfer, so they may learn who requested it
  // even without the "member:describe" permission that `Organization.owner` requires.
  const owner = await injector.get(Storage).getUserById({ id: organization.ownerId });

  if (!owner) {
    throw new Error('Owner not found.');
  }

  return {
    organization,
    ownerName: owner.displayName,
  };
};
