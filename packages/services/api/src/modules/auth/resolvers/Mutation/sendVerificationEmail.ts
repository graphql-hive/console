import { FORWARDED_IP_HEADER_NAME } from '../../../../modules/shared/providers/tokens';
import { EmailVerification } from '../../providers/email-verification';
import type { MutationResolvers } from './../../../../__generated__/types';

export const sendVerificationEmail: NonNullable<
  MutationResolvers['sendVerificationEmail']
> = async (_, { input }, { injector, req }) => {
  const forwardedIPHeaderName = injector.get(FORWARDED_IP_HEADER_NAME);
  const result = await injector.get(EmailVerification).sendVerificationEmail(
    {
      userIdentityId: input.userIdentityId,
      resend: input.resend ?? undefined,
    },
    req.headers[forwardedIPHeaderName]?.toString() ?? req.ip,
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
