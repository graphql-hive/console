import { Inject, Injectable, Scope } from 'graphql-modules';
import type { StripeBillingApi, StripeBillingApiInput } from '@hive/stripe-billing';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import { OrganizationBilling } from '../../../shared/entities';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import type { BillingConfig } from './tokens';
import { BILLING_CONFIG } from './tokens';

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class BillingProvider {
  private logger: Logger;
  private billingService;

  enabled = false;

  constructor(
    logger: Logger,
    private auditLog: AuditLogRecorder,
    private storage: Storage,
    private idTranslator: IdTranslator,
    private session: Session,
    @Inject(BILLING_CONFIG) billingConfig: BillingConfig,
  ) {
    this.logger = logger.child({ source: 'BillingProvider' });
    this.billingService = billingConfig.endpoint
      ? createTRPCProxyClient<StripeBillingApi>({
          links: [httpLink({ url: `${billingConfig.endpoint}/trpc`, fetch })],
        })
      : null;

    if (billingConfig.endpoint) {
      this.enabled = true;
    }
  }

  async upgradeToPro(input: StripeBillingApiInput['createSubscriptionForOrganization']) {
    this.logger.debug('Upgrading to PRO (input=%o)', input);
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    const result = this.billingService.createSubscriptionForOrganization.mutate(input);

    await this.auditLog.record({
      eventType: 'SUBSCRIPTION_CREATED',
      organizationId: input.organizationId,
      metadata: {
        operations: input.reserved.operations,
        paymentMethodId: input.paymentMethodId,
        newPlan: 'PRO',
        previousPlan: 'HOBBY',
      },
    });

    return result;
  }

  syncOrganization(input: StripeBillingApiInput['syncOrganizationToStripe']) {
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.billingService.syncOrganizationToStripe.mutate(input);
  }

  async getAvailablePrices() {
    this.logger.debug('Getting available prices');
    if (!this.billingService) {
      return null;
    }

    return await this.billingService.availablePrices.query();
  }

  async getOrganizationBillingParticipant(selector: {
    organizationId: string;
  }): Promise<OrganizationBilling | null> {
    this.logger.debug('Fetching organization billing (selector=%o)', selector);

    return this.storage.getOrganizationBilling({
      organizationId: selector.organizationId,
    });
  }

  getActiveSubscription(input: StripeBillingApiInput['activeSubscription']) {
    this.logger.debug('Fetching active subscription (input=%o)', input);
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.billingService.activeSubscription.query(input);
  }

  invoices(input: StripeBillingApiInput['invoices']) {
    this.logger.debug('Fetching invoices (input=%o)', input);
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.billingService.invoices.query(input);
  }

  upcomingInvoice(input: StripeBillingApiInput['upcomingInvoice']) {
    this.logger.debug('Fetching upcoming invoices (input=%o)', input);
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.billingService.upcomingInvoice.query(input);
  }

  async downgradeToHobby(input: StripeBillingApiInput['cancelSubscriptionForOrganization']) {
    this.logger.debug('Downgrading to Hobby (input=%o)', input);
    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    await this.auditLog.record({
      eventType: 'SUBSCRIPTION_CANCELED',
      organizationId: input.organizationId,
      metadata: {
        newPlan: 'HOBBY',
        previousPlan: 'PRO',
      },
    });

    return await this.billingService.cancelSubscriptionForOrganization.mutate(input);
  }

  public async generateStripePortalLink(args: { organizationSlug: string }) {
    this.logger.debug('Generating Stripe portal link for id:' + args.organizationSlug);

    if (!this.billingService) {
      throw new Error(`Billing service is not configured!`);
    }

    const organizationId = await this.idTranslator.translateOrganizationId({
      organizationSlug: args.organizationSlug,
    });

    await this.session.assertPerformAction({
      action: 'billing:describe',
      organizationId,
      params: {
        organizationId,
      },
    });

    return await this.billingService.generateStripePortalLink.mutate({
      organizationId,
    });
  }
}
