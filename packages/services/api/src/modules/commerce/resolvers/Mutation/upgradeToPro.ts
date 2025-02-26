import { GraphQLError } from 'graphql';
import { TRPCClientError } from '@trpc/client';
import { Session } from '../../../auth/lib/authz';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { USAGE_DEFAULT_LIMITATIONS } from '../../constants';
import { BillingProvider } from '../../providers/billing.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const upgradeToPro: NonNullable<MutationResolvers['upgradeToPro']> = async (
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

  if (organization.billingPlan === 'HOBBY') {
    // Configure user to use Stripe payments, create billing participant record for the org
    try {
      await injector.get(BillingProvider).upgradeToPro({
        organizationId,
        couponCode: args.input.couponCode,
        paymentMethodId: args.input.paymentMethodId,
        reserved: {
          operations: Math.floor(args.input.monthlyLimits.operations / 1_000_000),
        },
      });
    } catch (e) {
      if (e instanceof TRPCClientError) {
        throw new GraphQLError(`Falied to upgrade: ${e.message}`);
      }

      throw e;
    }

    // Upgrade the actual org plan to PRO
    organization = await injector
      .get(OrganizationManager)
      .updatePlan({ plan: 'PRO', organizationId: organizationId });

    // Upgrade the limits
    organization = await injector.get(OrganizationManager).updateRateLimits({
      organizationId: organizationId,
      monthlyRateLimit: {
        retentionInDays: USAGE_DEFAULT_LIMITATIONS.PRO.retention,
        operations: args.input.monthlyLimits.operations || USAGE_DEFAULT_LIMITATIONS.PRO.operations,
      },
    });

    return {
      previousPlan: 'HOBBY',
      newPlan: 'PRO',
      organization,
    };
  }

  throw new GraphQLError(`Unable to upgrade to Pro from your current plan`);
};
