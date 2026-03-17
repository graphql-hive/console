import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const usageEstimatorRouter = router({
  estimateOperationsForOrganization: publicProcedure
    .input(
      z
        .object({
          month: z.number().min(1).max(12),
          year: z.any(),
          organizationId: z.string().min(1),
        })
        .required(),
    )
    .query(async ({ ctx, input }) => {
      // The range must be defined at runtime to avoid issues at the end of the year
      const now = new Date();
      const rangeValidation = z
        .number()
        .min(now.getFullYear() - 1)
        .max(new Date(now.setMonth(now.getMonth() + 1)).getFullYear());
      const year = rangeValidation.parse(input.year);

      const estimationResponse =
        await ctx.usageEstimator.estimateCollectedOperationsForOrganization({
          organizationId: input.organizationId,
          month: input.month,
          year,
        });

      if (!estimationResponse.data.length) {
        return {
          totalOperations: 0,
        };
      }

      return {
        totalOperations: parseInt(estimationResponse.data[0].total),
      };
    }),
  estimateOperationsForAllTargets: publicProcedure
    .input(
      z
        .object({
          startTime: z.string().min(1),
          endTime: z.string().min(1),
        })
        .required(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.usageEstimator.estimateOperationsForAllTargets({
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
      });
    }),
});

export type UsageEstimatorRouter = typeof usageEstimatorRouter;
