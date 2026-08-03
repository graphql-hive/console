import { HiveError } from '../../../../shared/errors';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { Storage } from '../../../shared/providers/storage';
import { USAGE_DEFAULT_LIMITATIONS } from '../../constants';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOrgRateLimit: NonNullable<MutationResolvers['updateOrgRateLimit']> = async (
  _,
  args,
  { injector },
) => {
  const organizationId = await injector.get(IdTranslator).translateOrganizationId({
    organizationSlug: args.selector.organizationSlug,
  });

  const organization = await injector.get(Storage).getOrganization({
    organizationId: organizationId,
  });

  if (organization.billingPlan !== 'PRO') {
    throw new HiveError('Only PRO organizations can update rate limits via API');
  }

  return injector.get(OrganizationManager).updateRateLimits({
    organizationId: organizationId,
    monthlyRateLimit: {
      retentionInDays: USAGE_DEFAULT_LIMITATIONS.PRO.retention,
      operations: args.monthlyLimits.operations,
    },
  });
};
