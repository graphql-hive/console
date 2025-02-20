import { Logger } from '../../shared/providers/logger';
import { BillingProvider } from '../providers/billing.provider';
import { RateLimitProvider } from '../providers/rate-limit.provider';
import type { BillingPlanType, OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  | 'billingConfiguration'
  | 'plan'
  | 'rateLimit'
  | 'viewerCanDescribeBilling'
  | 'viewerCanModifyBilling'
  | '__isTypeOf'
> = {
  plan: org => (org.billingPlan || 'HOBBY') as BillingPlanType,
  billingConfiguration: async (org, _args, { injector }) => {
    if (org.billingPlan === 'ENTERPRISE') {
      return {
        hasActiveSubscription: true,
        canUpdateSubscription: false,
        hasPaymentIssues: false,
        paymentMethod: null,
        billingAddress: null,
        invoices: null,
        upcomingInvoice: null,
      };
    }

    const billingRecord = await injector
      .get(BillingProvider)
      .getOrganizationBillingParticipant({ organizationId: org.id });

    if (!billingRecord) {
      return {
        hasActiveSubscription: false,
        canUpdateSubscription: true,
        hasPaymentIssues: false,
        paymentMethod: null,
        billingAddress: null,
        invoices: null,
        upcomingInvoice: null,
      };
    }

    // This is a special case where customer is on Pro and doesn't have a record for external billing.
    // This happens when the customer is paying through an external system and not through Stripe.
    if (org.billingPlan === 'PRO' && billingRecord.externalBillingReference === 'wire') {
      return {
        hasActiveSubscription: true,
        canUpdateSubscription: false,
        hasPaymentIssues: false,
        paymentMethod: null,
        billingAddress: null,
        invoices: null,
        upcomingInvoice: null,
      };
    }

    const subscriptionInfo = await injector.get(BillingProvider).getActiveSubscription({
      organizationId: billingRecord.organizationId,
    });

    if (!subscriptionInfo) {
      return {
        hasActiveSubscription: false,
        canUpdateSubscription: true,
        hasPaymentIssues: false,
        paymentMethod: null,
        billingAddress: null,
        invoices: null,
        upcomingInvoice: null,
      };
    }

    const [invoices, upcomingInvoice] = await Promise.all([
      injector.get(BillingProvider).invoices({
        organizationId: billingRecord.organizationId,
      }),
      injector.get(BillingProvider).upcomingInvoice({
        organizationId: billingRecord.organizationId,
      }),
    ]);

    const hasPaymentIssues = invoices?.some(
      i => i.charge !== null && typeof i.charge === 'object' && i.charge?.failure_code !== null,
    );

    return {
      hasActiveSubscription: subscriptionInfo.subscription !== null,
      canUpdateSubscription: subscriptionInfo.subscription !== null,
      hasPaymentIssues,
      paymentMethod: subscriptionInfo.paymentMethod?.card || null,
      billingAddress: subscriptionInfo.paymentMethod?.billing_details || null,
      invoices,
      upcomingInvoice,
    };
  },
  viewerCanDescribeBilling: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'billing:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  viewerCanModifyBilling: async (organization, _arg, { session }) => {
    return session.canPerformAction({
      action: 'billing:update',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  rateLimit: async (org, _args, { injector }) => {
    let limitedForOperations = false;
    const logger = injector.get(Logger);

    try {
      const operationsRateLimit = await injector.get(RateLimitProvider).checkRateLimit({
        entityType: 'organization',
        id: org.id,
        type: 'operations-reporting',
        token: null,
      });

      logger.debug('Fetched rate-limit info:', { orgId: org.id, operationsRateLimit });
      limitedForOperations = operationsRateLimit.usagePercentage >= 1;
    } catch (e) {
      logger.error('Failed to fetch rate-limit info:', org.id, e);
    }

    return {
      limitedForOperations,
      operations: org.monthlyRateLimit.operations,
      retentionInDays: org.monthlyRateLimit.retentionInDays,
    };
  },
};
