import { ReactElement } from 'react';
import { authClient } from '@/lib/auth';
import { HiveStripeWrapper } from '@/lib/billing/stripe';
import { Navigate, useLocation } from '@tanstack/react-router';

/**
 * Utility for wrapping a component with an authenticated container that has the default application layout.
 */
export const authenticated =
  <TProps extends {}>(Component: (props: TProps) => ReactElement | null) =>
  (props: TProps) => {
    const session = authClient.useSession();
    const location = useLocation();

    if (session.isPending) {
      return null;
    }

    if (session.error) {
      throw session.error;
    }

    if (!session.data) {
      return (
        <Navigate
          to="/auth/sign-in"
          search={{ redirectToPath: encodeURIComponent(location.pathname) }}
        />
      );
    }

    return (
      <HiveStripeWrapper>
        <Component {...props} />
      </HiveStripeWrapper>
    );
  };
