import { z } from 'zod';

export const SuperTokensSessionPayloadV2Model = z.object({
  version: z.literal('2'),
  superTokensUserId: z.string(),
  email: z.string(),
  userId: z.string(),
  oidcIntegrationId: z.string().nullable(),
});

export type SuperTokensSessionPayload = z.TypeOf<typeof SuperTokensSessionPayloadV2Model>;
