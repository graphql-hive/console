import { createHash } from 'node:crypto';
import { z } from 'zod';
import { handleTRPCError } from '@hive/service-common';
import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { EmailInputShape } from './shapes';
import { renderEmailVerificationEmail } from './templates/email-verification';
import { renderOrganizationInvitation } from './templates/organization-invitation';
import { renderPasswordResetEmail } from './templates/password-reset';

const t = initTRPC.context<Context>().create();
const procedure = t.procedure.use(handleTRPCError);

export const emailsApiRouter = t.router({
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
});

export type EmailsApi = typeof emailsApiRouter;
export type EmailsApiInput = inferRouterInputs<EmailsApi>;
