import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

const VALIDATION = z
  .object({
    id: z.string().min(1),
    entityType: z.enum(['organization', 'target']),
    type: z.enum(['operations-reporting']),
    /**
     * Token is optional, and used only when an additional blocking (WAF) process is needed.
     */
    token: z.string().nullish().optional(),
  })
  .required();

export const rateLimitRouter = router({
  getRetention: publicProcedure
    .input(
      z
        .object({
          targetId: z.string().nonempty(),
        })
        .required(),
    )
    .query(({ ctx, input }) => {
      return ctx.rateLimiter.getRetention(input.targetId);
    }),
  checkRateLimit: publicProcedure.input(VALIDATION).query(({ ctx, input }) => {
    return ctx.rateLimiter.checkLimit(input);
  }),
});

export type RateLimitRouter = typeof rateLimitRouter;
