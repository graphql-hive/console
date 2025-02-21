import { Stripe } from 'stripe';
import { Storage } from '@hive/api';
import { ServiceLogger } from '@hive/service-common';
import type { UsageEstimator } from '../usage-estimator/estimator';

export type StripeBilling = ReturnType<typeof createStripeBilling>;

export function createStripeBilling(config: {
  logger: ServiceLogger;
  usageEstimator: UsageEstimator;
  storage: Storage;
  stripe: {
    token: string;
    syncIntervalMs: number;
  };
}) {
  const logger = config.logger;
  const stripeApi = new Stripe(config.stripe.token, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
    httpClient: Stripe.createFetchHttpClient(fetch),
  });
  const loadStripeData$ = ensureStripeProducts();

  async function ensureStripeProducts(): Promise<{
    operationsPrice: Stripe.Price;
    basePrice: Stripe.Price;
  }> {
    const relevantProducts = await stripeApi.products
      .list({
        active: true,
        type: 'service',
      })
      .then(r => r.data.filter(v => v.metadata?.hive_plan && v.active === true));

    if (relevantProducts.length !== 1) {
      throw new Error(
        `Invalid count of Hive products configured in Stripe: ${relevantProducts.length}`,
      );
    }

    const prices = (await stripeApi.prices.list({
      product: relevantProducts[0].id,
      active: true,
      expand: ['data.tiers'],
    })) as Stripe.Response<Stripe.ApiList<Stripe.Price & { tiers: Stripe.Price.Tier[] }>>;

    const operationsPrice = prices.data.find(v => v.metadata?.hive_usage === 'operations');

    if (!operationsPrice) {
      throw new Error(`Failed to find Stripe price ID with Hive metadata for operations`);
    }

    const basePrice = prices.data.find(v => v.metadata?.hive_usage === 'base');

    if (!basePrice) {
      throw new Error(`Failed to find Stripe price ID with Hive metadata for base price`);
    }

    return {
      operationsPrice,
      basePrice,
    };
  }

  return {
    storage: config.storage,
    stripe: stripeApi,
    stripeData$: loadStripeData$,
    async readiness() {
      return true;
    },
    async start() {
      logger.info(
        `Stripe Billing Sync starting, will sync Stripe every ${config.stripe.syncIntervalMs}ms...`,
      );

      const stripeData = await loadStripeData$;
      logger.info(`Stripe is configured correctly, prices info: %o`, stripeData);
    },
    async stop() {
      logger.info(`Stripe Billing Sync stopped...`);
    },
  };
}
