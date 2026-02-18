import { z } from 'zod';

export const SuperTokensSessionPayloadV2Model = z.object({
  version: z.literal('2'),
  superTokensUserId: z.string(),
  email: z.string(),
  userId: z.string(),
  oidcIntegrationId: z.string().nullable(),
});

export type SuperTokensSessionPayload = z.TypeOf<typeof SuperTokensSessionPayloadV2Model>;

export function validatePassword(password: string):
  | {
      status: 'OK';
    }
  | {
      status: 'INVALID';
      message: string;
    } {
  if (password.length < 8) {
    return { status: 'INVALID', message: 'Password must be at least 8 characters long.' };
  }

  if ((password.match(/[A-Z]/g) || []).length < 2) {
    return { status: 'INVALID', message: 'Password must contain at least two uppercase letters.' };
  }

  if ((password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length < 1) {
    return { status: 'INVALID', message: 'Password must contain at least one special character.' };
  }

  if ((password.match(/[0-9]/g) || []).length < 2) {
    return { status: 'INVALID', message: 'Password must contain at least two digits.' };
  }

  if ((password.match(/[a-z]/g) || []).length < 2) {
    return { status: 'INVALID', message: 'Password must contain at least two lowercase letters.' };
  }

  return { status: 'OK' };
}
