import { BillingProvider } from '../../providers/billing.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const generateStripePortalLink: NonNullable<
  MutationResolvers['generateStripePortalLink']
> = async (_, args, { injector }) => {
  return injector.get(BillingProvider).generateStripePortalLink({
    organizationSlug: args.selector.organizationSlug,
  });
};
