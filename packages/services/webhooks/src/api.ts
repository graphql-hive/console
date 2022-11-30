import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './types';

const webhookInput = z
  .object({
    endpoint: z.string().nonempty(),
    event: z
      .object({
        organization: z
          .object({
            id: z.string().nonempty(),
            cleanId: z.string().nonempty(),
            name: z.string().nonempty(),
          })
          .required(),
        project: z
          .object({
            id: z.string().nonempty(),
            cleanId: z.string().nonempty(),
            name: z.string().nonempty(),
          })
          .required(),
        target: z
          .object({
            id: z.string().nonempty(),
            cleanId: z.string().nonempty(),
            name: z.string().nonempty(),
          })
          .required(),
        schema: z
          .object({
            id: z.string().nonempty(),
            valid: z.boolean(),
            commit: z.string().nonempty(),
          })
          .required(),
        changes: z.array(z.any()),
        errors: z.array(z.any()),
      })
      .required(),
  })
  .required();

const t = initTRPC.context<Context>().create();

export const webhooksApiRouter = t.router({
  schedule: t.procedure.input(webhookInput).mutation(async ({ ctx, input }) => {
    try {
      const job = await ctx.schedule(input);

      return { job: job.id ?? 'unknown' };
    } catch (error) {
      ctx.errorHandler('Failed to schedule a webhook', error as Error, ctx.logger);
      throw error;
    }
  }),
});

export type WebhooksApi = typeof webhooksApiRouter;
export type WebhooksApiInput = inferRouterInputs<WebhooksApi>;
