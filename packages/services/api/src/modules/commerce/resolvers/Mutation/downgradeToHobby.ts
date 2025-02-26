import { GraphQLError } from 'graphql';
import { Session } from '../../../auth/lib/authz';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { USAGE_DEFAULT_LIMITATIONS } from '../../constants';
import { BillingProvider } from '../../providers/billing.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const downgradeToHobby: NonNullable<MutationResolvers['downgradeToHobby']> = async (
  _,
  args,
  { injector },
) => {
  const organizationId = await injector.get(IdTranslator).translateOrganizationId({
    organizationSlug: args.input.organization.organizationSlug,
  });

  await injector.get(Session).assertPerformAction({
    action: 'billing:update',
    organizationId: organizationId,
    params: {
      organizationId: organizationId,
    },
  });

  let organization = await injector.get(OrganizationManager).getOrganization({
    organizationId: organizationId,
  });

  if (organization.billingPlan === 'PRO') {
    // Configure user to use Stripe payments, create billing participant record for the org
    await injector.get(BillingProvider).downgradeToHobby({
      organizationId,
    });

    // Upgrade the actual org plan to HOBBY
    organization = await injector
      .get(OrganizationManager)
      .updatePlan({ plan: 'HOBBY', organizationId: organizationId });

    // Upgrade the limits
    organization = await injector.get(OrganizationManager).updateRateLimits({
      organizationId: organizationId,
      monthlyRateLimit: {
        retentionInDays: USAGE_DEFAULT_LIMITATIONS.HOBBY.retention,
        operations: USAGE_DEFAULT_LIMITATIONS.HOBBY.operations,
      },
    });

    return {
      previousPlan: 'PRO',
      newPlan: 'HOBBY',
      organization,
    };
  }
  throw new GraphQLError(`Unable to downgrade from Pro from your current plan`);
};
