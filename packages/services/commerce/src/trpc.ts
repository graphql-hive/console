import { handleTRPCError, type FastifyRequest } from '@hive/service-common';
import { initTRPC } from '@trpc/server';
import type { RateLimiter } from './rate-limit/limiter';
import type { StripeBilling } from './stripe-billing/billing';
import type { UsageEstimator } from './usage-estimator/estimator';

export type Context = {
  req: FastifyRequest;
  usageEstimator: UsageEstimator;
  rateLimiter: RateLimiter;
  stripeBilling: StripeBilling;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure.use(handleTRPCError);
