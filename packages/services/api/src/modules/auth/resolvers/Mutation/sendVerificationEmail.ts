import { RateLimitConfig } from '../../../../modules/shared/providers/tokens';
import { EmailVerification } from '../../providers/email-verification';
import type { MutationResolvers } from './../../../../__generated__/types';

export const sendVerificationEmail: NonNullable<
  MutationResolvers['sendVerificationEmail']
> = async (_, { input }, { injector, req }) => {
  const rateLimitConfig = injector.get(RateLimitConfig);

  const result = await injector.get(EmailVerification).sendVerificationEmail(
    {
      userIdentityId: input.userIdentityId,
      resend: input.resend ?? undefined,
    },
    rateLimitConfig.config
      ? (req.headers[rateLimitConfig.config.ipHeaderName]?.toString() ?? req.ip)
      : null,
  );

  if (!result.ok) {
    return {
      error: {
        message: result.message,
        emailAlreadyVerified: result.emailAlreadyVerified,
      },
    };
  }

  return {
    ok: {
      expiresAt: result.expiresAt,
    },
  };
};
