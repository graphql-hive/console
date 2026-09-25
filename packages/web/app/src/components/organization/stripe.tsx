import { ReactNode } from 'react';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { useSlugs } from '@/lib/hooks';
import { Navigate } from '@tanstack/react-router';

export function RenderIfStripeAvailable(props: { children: ReactNode }) {
  const { organizationSlug } = useSlugs('organization');
  /**
   * If Stripe is not enabled we redirect the user to the organization.
   */
  if (!getIsStripeEnabled()) {
    return <Navigate to="/$organizationSlug" params={{ organizationSlug }} />;
  }

  return <>{props.children}</>;
}
