import { ReactElement } from 'react';
import { authClient } from '@/lib/auth';
import { HiveStripeWrapper } from '@/lib/billing/stripe';
import { Navigate } from '@tanstack/react-router';

/**
 * Utility for wrapping a component with an authenticated container that has the default application layout.
 */
export const authenticated =
  <TProps extends {}>(Component: (props: TProps) => ReactElement | null) =>
  (props: TProps) => {
    const session = authClient.useSession();

    if (session.isPending) {
      // KAMIL: add loading state
      return null;
    }

    if (session.error) {
      // KAMIL: add error state
      console.log(session.error);
      return null;
    }

    if (!session.data) {
      return <Navigate to="/auth/sign-in" />;
    }

    return (
      <HiveStripeWrapper>
        <Component {...props} />
      </HiveStripeWrapper>
    );
  };
