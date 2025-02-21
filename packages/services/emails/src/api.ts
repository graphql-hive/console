import { createHash } from 'node:crypto';
import { z } from 'zod';
import { handleTRPCError } from '@hive/service-common';
import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { renderAuditLogsReportEmail } from './templates/audit-logs-report';
import { renderEmailVerificationEmail } from './templates/email-verification';
import { renderOrganizationInvitation } from './templates/organization-invitation';
import { renderOrganizationOwnershipTransferEmail } from './templates/organization-ownership-transfer';
import { renderPasswordResetEmail } from './templates/password-reset';
import { renderRateLimitExceededEmail } from './templates/rate-limit-exceeded';
import { renderRateLimitWarningEmail } from './templates/rate-limit-warning';

const t = initTRPC.context<Context>().create();
const procedure = t.procedure.use(handleTRPCError);

export const emailsApiRouter = t.router({
  sendAuditLogsReportEmail: procedure
    .input(
      z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        formattedStartDate: z.string(),
        formattedEndDate: z.string(),
        url: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const job = await ctx.schedule({
          email: input.email,
          subject: 'Hive - Audit Log Report',
          body: renderAuditLogsReportEmail({
            url: input.url,
            organizationName: input.organizationName,
            formattedStartDate: input.formattedStartDate,
            formattedEndDate: input.formattedEndDate,
          }),
        });

        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendOrganizationOwnershipTransferEmail: procedure
    .input(
      z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        authorName: z.string(),
        email: z.string(),
        link: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const job = await ctx.schedule({
          email: input.email,
          subject: `Organization transfer from ${input.authorName} (${input.organizationName})`,
          body: renderOrganizationOwnershipTransferEmail({
            link: input.link,
            organizationName: input.organizationName,
            authorName: input.authorName,
          }),
        });

        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendOrganizationInviteEmail: procedure
    .input(
      z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        code: z.string(),
        email: z.string(),
        link: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const subject = `You have been invited to join ${input.organizationName}`;
        const job = await ctx.schedule({
          id: JSON.stringify({
            id: 'org-invitation',
            organization: input.organizationId,
            code: createHash('sha256').update(input.code).digest('hex'),
            email: createHash('sha256').update(input.email).digest('hex'),
          }),
          email: input.email,
          subject,
          body: renderOrganizationInvitation({
            link: input.link,
            organizationName: input.organizationName,
          }),
        });

        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendEmailVerificationEmail: procedure
    .input(
      z.object({
        user: z.object({
          email: z.string(),
          id: z.string(),
        }),
        emailVerifyLink: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const subject = 'Verify your email';
        const job = await ctx.schedule({
          id: `email-verification-${input.user.id}-${new Date().getTime()}`,
          email: input.user.email,
          subject,
          body: renderEmailVerificationEmail({
            subject,
            verificationLink: input.emailVerifyLink,
            toEmail: input.user.email,
          }),
        });

        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendPasswordResetEmail: procedure
    .input(
      z.object({
        user: z.object({
          email: z.string(),
          id: z.string(),
        }),
        passwordResetLink: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const subject = 'Reset your password.';
        const job = await ctx.schedule({
          id: `password-reset-${input.user.id}-${new Date().getTime()}`,
          email: input.user.email,
          subject,
          body: renderPasswordResetEmail({
            subject,
            passwordResetLink: input.passwordResetLink,
            toEmail: input.user.email,
          }),
        });
        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendRateLimitExceededEmail: procedure
    .input(
      z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        limit: z.number(),
        currentUsage: z.number(),
        startDate: z.number(),
        endDate: z.number(),
        subscriptionManagementLink: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const job = await ctx.schedule({
          // If the jobId would include only the period and org id, then we would be able to notify the user once per month.
          // There's a chance that an organization will increase the limit and we might need to notify them again.
          id: JSON.stringify({
            id: 'rate-limit-exceeded',
            organization: input.organizationId,
            period: {
              start: input.startDate,
              end: input.endDate,
            },
            limit: input.limit,
          }),
          email: input.email,
          subject: `GraphQL-Hive operations quota for ${input.organizationName} exceeded`,
          body: renderRateLimitExceededEmail({
            organizationName: input.organizationName,
            limit: input.limit,
            currentUsage: input.currentUsage,
            subscriptionManagementLink: input.subscriptionManagementLink,
          }),
        });
        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
  sendRateLimitWarningEmail: procedure
    .input(
      z.object({
        organizationId: z.string(),
        organizationName: z.string(),
        limit: z.number(),
        currentUsage: z.number(),
        startDate: z.number(),
        endDate: z.number(),
        subscriptionManagementLink: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const job = await ctx.schedule({
          // If the jobId would include only the period and org id, then we would be able to notify the user once per month.
          // There's a chance that an organization will increase the limit and we might need to notify them again.
          id: JSON.stringify({
            id: 'rate-limit-warning',
            organization: input.organizationId,
            period: {
              start: input.startDate,
              end: input.endDate,
            },
            limit: input.limit,
          }),
          email: input.email,
          subject: `${input.organizationName} is approaching its rate limit`,
          body: renderRateLimitWarningEmail({
            organizationName: input.organizationName,
            limit: input.limit,
            currentUsage: input.currentUsage,
            subscriptionManagementLink: input.subscriptionManagementLink,
          }),
        });
        return { job: job.id ?? 'unknown' };
      } catch (error) {
        ctx.errorHandler('Failed to schedule an email', error as Error);
        throw error;
      }
    }),
});

export type EmailsApi = typeof emailsApiRouter;
export type EmailsApiInput = inferRouterInputs<EmailsApi>;
