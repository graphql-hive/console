import { router } from '@trpc/server';
import type { inferAsyncReturnType } from '@trpc/server';
import { reservedOrganizationNames, organizationAdminScopes } from '@hive/api';
import type { Storage } from '@hive/api';
import { z } from 'zod';

export async function createContext({ storage }: { storage: Storage }) {
  return {
    storage,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;

export const internalApiRouter = router<Context>().mutation('ensureUser', {
  input: z
    .object({
      superTokensUserId: z.string().min(1),
      email: z.string().min(1),
    })
    .required(),
  resolve({ input, ctx }) {
    return ctx.storage.ensureUserExists({
      ...input,
      reservedOrgNames: reservedOrganizationNames,
      scopes: organizationAdminScopes,
    });
  },
});

export type InternalApi = typeof internalApiRouter;
