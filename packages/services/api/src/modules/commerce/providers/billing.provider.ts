import { Inject, Injectable, Scope } from 'graphql-modules';
import LRU from 'lru-cache';
import { OrganizationBilling } from '../../../shared/entities';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import {
  COMMERCE_TRPC_CLIENT,
  type CommerceTrpcClient,
  type CommerceTrpcClientInputs,
} from './commerce-client';

type BillingInput = CommerceTrpcClientInputs['stripeBilling'];

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class BillingProvider {
  private logger: Logger;

  enabled = false;

  constructor(
    @Inject(COMMERCE_TRPC_CLIENT) private client: CommerceTrpcClient,
    logger: Logger,
    private auditLog: AuditLogRecorder,
    private storage: Storage,
    private idTranslator: IdTranslator,
    private session: Session,
  ) {
    this.logger = logger.child({ source: 'CommerceProvider' });

    this.enabled = !!client;
  }

  async upgradeToPro(input: BillingInput['createSubscriptionForOrganization']) {
    this.logger.debug('Upgrading to PRO (input=%o)', input);
    if (!this.client) {
      throw new Error(`Billing service is not configured!`);
    }

    const result = this.client.stripeBilling.createSubscriptionForOrganization.mutate(input);

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

  syncOrganization(input: BillingInput['syncOrganizationToStripe']) {
    if (!this.client) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.client.stripeBilling.syncOrganizationToStripe.mutate(input);
  }

  async getAvailablePrices() {
    this.logger.debug('Getting available prices');
    if (!this.client) {
      return null;
    }

    return await this.client.stripeBilling.availablePrices.query();
  }

  async getOrganizationBillingParticipant(selector: {
    organizationId: string;
  }): Promise<OrganizationBilling | null> {
    this.logger.debug('Fetching organization billing (selector=%o)', selector);

    return this.storage.getOrganizationBilling({
      organizationId: selector.organizationId,
    });
  }

  getActiveSubscription(input: BillingInput['activeSubscription']) {
    this.logger.debug('Fetching active subscription (input=%o)', input);
    if (!this.client) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.client.stripeBilling.activeSubscription.query(input);
  }

  invoices(input: BillingInput['invoices']) {
    this.logger.debug('Fetching invoices (input=%o)', input);
    if (!this.client) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.client.stripeBilling.invoices.query(input);
  }

  upcomingInvoice(input: BillingInput['upcomingInvoice']) {
    this.logger.debug('Fetching upcoming invoices (input=%o)', input);
    if (!this.client) {
      throw new Error(`Billing service is not configured!`);
    }

    return this.client.stripeBilling.upcomingInvoice.query(input);
  }

  async downgradeToHobby(input: BillingInput['cancelSubscriptionForOrganization']) {
    this.logger.debug('Downgrading to Hobby (input=%o)', input);
    if (!this.client) {
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

    return await this.client.stripeBilling.cancelSubscriptionForOrganization.mutate(input);
  }

  async generateStripePortalLink(args: { organizationSlug: string }) {
    this.logger.debug('Generating Stripe portal link for id:' + args.organizationSlug);

    if (!this.client) {
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

    return await this.client.stripeBilling.generateStripePortalLink.mutate({
      organizationId,
    });
  }
}
