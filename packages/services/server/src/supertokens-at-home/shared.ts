import { z } from 'zod';

export const SuperTokensSessionPayloadV2Model = z.object({
  version: z.literal('2'),
  superTokensUserId: z.string(),
  email: z.string(),
  userId: z.string(),
  oidcIntegrationId: z.string().nullable(),
});

export type SuperTokensSessionPayload = z.TypeOf<typeof SuperTokensSessionPayloadV2Model>;

const PasswordModel = z
  .string()
  .min(10, { message: 'Password must be at least 10 characters long.' })
  // Check 2: At least one uppercase letter
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
  // Check 3: At least one special character
  .regex(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character.',
  })
  // Check 4: At least one digit
  .regex(/[0-9]/, { message: 'Password must contain at least one digit.' })
  // Check 5: At least one lowercase letter
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' });

export function validatePassword(password: string):
  | {
      status: 'OK';
    }
  | {
      status: 'INVALID';
      message: string;
    } {
  const result = PasswordModel.safeParse(password);

  if (!result.success) {
    return {
      status: 'INVALID',
      message: result.error.message,
    };
  }

  return { status: 'OK' };
}
