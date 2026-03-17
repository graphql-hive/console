import { rateLimitRouter } from './rate-limit';
import { stripeBillingRouter } from './stripe-billing';
import { router } from './trpc';
import { usageEstimatorRouter } from './usage-estimator';

export const commerceRouter = router({
  usageEstimator: usageEstimatorRouter,
  rateLimit: rateLimitRouter,
  stripeBilling: stripeBillingRouter,
});

export type CommerceRouter = typeof commerceRouter;
