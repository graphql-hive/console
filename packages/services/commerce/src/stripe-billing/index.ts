import { addDays, startOfMonth } from 'date-fns';
import { Stripe } from 'stripe';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const stripeBillingRouter = router({
  availablePrices: publicProcedure.query(async ({ ctx }) => {
    return await ctx.stripeBilling.stripeData$;
  }),
  invoices: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      const organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });

      if (!organizationBillingRecord) {
        throw new Error(`Organization does not have a subscription record!`);
      }

      const invoices = await ctx.stripeBilling.stripe.invoices.list({
        customer: organizationBillingRecord.externalBillingReference,
        expand: ['data.charge'],
      });

      return invoices.data;
    }),
  upcomingInvoice: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      const organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });

      if (!organizationBillingRecord) {
        throw new Error(`Organization does not have a subscription record!`);
      }

      try {
        const upcomingInvoice = await ctx.stripeBilling.stripe.invoices.retrieveUpcoming({
          customer: organizationBillingRecord.externalBillingReference,
        });

        return upcomingInvoice;
      } catch (e) {
        return null;
      }
    }),
  activeSubscription: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
      }),
    )
    .query(async ({ ctx, input }) => {
      ctx.req.log.debug(
        'Find active subscription for organization. (organizationId=%s)',
        input.organizationId,
      );

      const storage = ctx.stripeBilling.storage;
      const organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });

      if (!organizationBillingRecord) {
        ctx.req.log.debug(
          'No billing record found for organization. (organizationId=%s)',
          input.organizationId,
        );
        throw new Error(`Organization does not have a subscription record!`);
      }

      ctx.req.log.debug(
        'Load customer from stripe based on external billing reference. (organizationId=%s, externalBillingReference=%s)',
        input.organizationId,
        organizationBillingRecord.externalBillingReference,
      );

      const customer = await ctx.stripeBilling.stripe.customers.retrieve(
        organizationBillingRecord.externalBillingReference,
      );

      ctx.req.log.debug(
        'Stripe customer found (organizationId=%s, stripeCustomerId=%s, isDeleted=%s)',
        input.organizationId,
        customer.id,
        customer.deleted ?? false,
      );

      if (customer.deleted === true) {
        await storage.deleteOrganizationBilling({
          organizationId: input.organizationId,
        });

        ctx.req.log.debug(
          'Stripe customer is deleted (organizationId=%s, stripeCustomerId=%s, isDeleted=%s)',
          input.organizationId,
          customer.id,
          customer.deleted ?? false,
        );

        return null;
      }

      ctx.req.log.debug(
        'Load subscriptions for customer (organizationId=%s, stripeCustomerId=%s)',
        input.organizationId,
        customer.id,
      );

      const allSubscriptions = await ctx.stripeBilling.stripe.subscriptions.list({
        customer: customer.id,
      });

      ctx.req.log.debug(
        'Found total of %s subscription(s) (organizationId=%s, stripeCustomerId=%s)',
        String(allSubscriptions.data.length),
        input.organizationId,
        customer.id,
      );

      const actualSubscription =
        allSubscriptions.data.find(r => r.metadata?.hive_subscription) ?? null;

      if (!actualSubscription) {
        ctx.req.log.debug(
          'Could not find the subscription with the hive metadata. (organizationId=%s, stripeCustomerId=%s)',
          input.organizationId,
          customer.id,
        );
      }

      const paymentMethod = await ctx.stripeBilling.stripe.customers.listPaymentMethods(
        customer.id,
        {
          type: 'card',
          limit: 1,
        },
      );

      if (!paymentMethod) {
        ctx.req.log.debug(
          'Could not find the card payment method for he strip customer. (organizationId=%s, stripeCustomerId=%s)',
          input.organizationId,
          customer.id,
        );
      }

      return {
        paymentMethod: paymentMethod.data[0] || null,
        subscription: actualSubscription,
      };
    }),
  syncOrganizationToStripe: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
        reserved: z
          .object({
            /** in millions, value 1 is actually 1_000_000 */
            operations: z.number().nonnegative(),
          })
          .required(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      const [organizationBillingRecord, organization, stripePrices] = await Promise.all([
        storage.getOrganizationBilling({
          organizationId: input.organizationId,
        }),
        storage.getOrganization({
          organizationId: input.organizationId,
        }),
        ctx.stripeBilling.stripeData$,
      ]);

      if (organizationBillingRecord && organization) {
        const allSubscriptions = await ctx.stripeBilling.stripe.subscriptions.list({
          customer: organizationBillingRecord.externalBillingReference,
        });

        const actualSubscription = allSubscriptions.data.find(r => r.metadata?.hive_subscription);

        if (actualSubscription) {
          for (const item of actualSubscription.items.data) {
            if (item.plan.id === stripePrices.operationsPrice.id) {
              await ctx.stripeBilling.stripe.subscriptionItems.update(item.id, {
                quantity: input.reserved.operations,
              });
            }
          }
        }

        const updateParams: Stripe.CustomerUpdateParams = {};

        if (organizationBillingRecord.billingEmailAddress) {
          updateParams.email = organizationBillingRecord.billingEmailAddress;
        }

        if (Object.keys(updateParams).length > 0) {
          await ctx.stripeBilling.stripe.customers.update(
            organizationBillingRecord.externalBillingReference,
            updateParams,
          );
        }
      } else {
        throw new Error(
          `Failed to sync subscription for organization: failed to find find active record`,
        );
      }
    }),
  generateStripePortalLink: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      const organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });

      if (organizationBillingRecord === null) {
        throw new Error(
          `Failed to generate Stripe link for organization: no existing participant record`,
        );
      }

      const session = await ctx.stripeBilling.stripe.billingPortal.sessions.create({
        customer: organizationBillingRecord.externalBillingReference,
        return_url: 'https://app.graphql-hive.com/',
      });

      return session.url;
    }),
  cancelSubscriptionForOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().nonempty(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      const organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });

      if (organizationBillingRecord === null) {
        throw new Error(
          `Failed to cancel subscription for organization: no existing participant record`,
        );
      }

      const subscriptions = await ctx.stripeBilling.stripe.subscriptions
        .list({
          customer: organizationBillingRecord.externalBillingReference,
        })
        .then(v => v.data.filter(r => r.metadata?.hive_subscription));

      if (subscriptions.length === 0) {
        throw new Error(
          `Failed to cancel subscription for organization: failed to find linked Stripe subscriptions`,
        );
      }

      const actualSubscription = subscriptions[0];
      const response = await ctx.stripeBilling.stripe.subscriptions.cancel(actualSubscription.id, {
        prorate: true,
      });

      return response;
    }),
  createSubscriptionForOrganization: publicProcedure
    .input(
      z.object({
        paymentMethodId: z.string().nullish(),
        organizationId: z.string().nonempty(),
        couponCode: z.string().nullish(),
        reserved: z
          .object({
            /** in millions, value 1 is actually 1_000_000 */
            operations: z.number().nonnegative(),
          })
          .required(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const storage = ctx.stripeBilling.storage;
      let organizationBillingRecord = await storage.getOrganizationBilling({
        organizationId: input.organizationId,
      });
      const organization = await storage.getOrganization({
        organizationId: input.organizationId,
      });

      const orgOwner = await storage.getOrganizationOwner({
        organizationId: input.organizationId,
      });

      const customerId = organizationBillingRecord?.externalBillingReference
        ? organizationBillingRecord.externalBillingReference
        : await ctx.stripeBilling.stripe.customers
            .create({
              metadata: {
                external_reference_id: input.organizationId,
              },
              email: orgOwner.user.email,
              name: organization.name,
            })
            .then(r => r.id);

      if (!organizationBillingRecord) {
        organizationBillingRecord = await storage.createOrganizationBilling({
          externalBillingReference: customerId,
          organizationId: input.organizationId,
          billingEmailAddress: orgOwner.user.email,
        });
      }

      const existingPaymentMethods = (
        await ctx.stripeBilling.stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        })
      ).data;

      let paymentMethodId: string | null = null;

      if (input.paymentMethodId) {
        const paymentMethodConfiguredAlready = existingPaymentMethods.find(
          v => v.id === input.paymentMethodId,
        );

        if (paymentMethodConfiguredAlready) {
          paymentMethodId = paymentMethodConfiguredAlready.id;
        } else {
          paymentMethodId = (
            await ctx.stripeBilling.stripe.paymentMethods.attach(input.paymentMethodId, {
              customer: customerId,
            })
          ).id;
        }
      } else {
        paymentMethodId = existingPaymentMethods[0]?.id || null;
      }

      if (!paymentMethodId) {
        throw new Error(
          `Payment method is not specified, and customer does not have it configured.`,
        );
      }

      const stripePrices = await ctx.stripeBilling.stripeData$;

      const subscription = await ctx.stripeBilling.stripe.subscriptions.create({
        metadata: {
          hive_subscription: 'true',
        },
        coupon: input.couponCode || undefined,
        customer: customerId,
        default_payment_method: paymentMethodId,
        trial_end: Math.floor(addDays(new Date(), 30).getTime() / 1000),
        backdate_start_date: Math.floor(startOfMonth(new Date()).getTime() / 1000),
        items: [
          {
            price: stripePrices.basePrice.id,
            quantity: 1,
          },
          {
            price: stripePrices.operationsPrice.id,
            quantity: input.reserved.operations,
          },
        ],
      });

      return {
        organizationBilling: organizationBillingRecord,
        stripeCustomer: customerId,
        stripeSubscription: subscription,
      };
    }),
});

export type StripeBillingRouter = typeof stripeBillingRouter;
