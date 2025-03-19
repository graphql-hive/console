import { FC, ReactNode, Suspense, useState } from 'react';
import { env } from '@/env/frontend';
import { captureMessage } from '@sentry/react';
import { Elements as ElementsProvider } from '@stripe/react-stripe-js';
// Why not @stripe/stripe-js?
// `loadStrip` from the main entry loads Stripe.js before the function is called.
// Yes, you are as confused as I am.
// The `loadStrip` from `/pure` fixes this issue.
import { loadStripe } from '@stripe/stripe-js/pure';
import { getStripePublicKey } from './stripe-public-key';

export const HiveStripeWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  // eslint-disable-next-line react/hook-use-state -- we don't need setter
  const [stripe] = useState<ReturnType<typeof loadStripe> | void>(async () => {
    if (env.nodeEnv !== 'production') {
      return null;
    }

    const stripePublicKey = getStripePublicKey();

    if (!stripePublicKey) {
      return null;
    }

    try {
      return await loadStripe(stripePublicKey);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to load Stripe.js';
      captureMessage(message, {
        level: 'warning',
      });
      return null;
    }
  });

  if (!stripe) {
    return children;
  }

  return (
    <Suspense fallback={children}>
      <ElementsProvider stripe={stripe}>{children}</ElementsProvider>
    </Suspense>
  );
};
