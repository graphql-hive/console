import { FC, ReactNode, Suspense, useState } from 'react';
import { env } from '@/env/frontend';
import { Elements as ElementsProvider } from '@stripe/react-stripe-js';
// Why not @stripe/stripe-js?
// `loadStrip` from the main entry loads Stripe.js before the function is called.
// Yes, you are as confused as I am.
// The `loadStrip` from `/pure` fixes this issue.
import { loadStripe } from '@stripe/stripe-js/pure';
import { getStripePublicKey } from './stripe-public-key';

export const HiveStripeWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  // eslint-disable-next-line react/hook-use-state -- we don't need setter
  const [stripe] = useState<ReturnType<typeof loadStripe> | void>(() => {
    if (env.nodeEnv !== 'production') {
      return;
    }

    const stripePublicKey = getStripePublicKey();

    if (!stripePublicKey) {
      return;
    }

    return loadStripe(stripePublicKey);
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
