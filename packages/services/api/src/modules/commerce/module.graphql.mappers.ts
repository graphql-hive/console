import type { Stripe } from 'stripe';

export type BillingPaymentMethodMapper = Stripe.PaymentMethod.Card;
export type BillingDetailsMapper = Stripe.PaymentMethod.BillingDetails;
export type BillingInvoiceMapper = Stripe.Invoice | Stripe.UpcomingInvoice;
