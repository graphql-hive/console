import { CryptoProvider } from 'packages/services/api/src/modules/shared/providers/crypto';
import { z } from 'zod';
import type { Storage } from '@hive/api';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from '@hive/api';
import { initTRPC } from '@trpc/server';

export type Context = {
  storage: Storage;
  crypto: CryptoProvider;
};

const oidcDefaultScopes = [
  OrganizationAccessScope.READ,
  ProjectAccessScope.READ,
  TargetAccessScope.READ,
  TargetAccessScope.REGISTRY_READ,
];

const t = initTRPC.context<Context>().create();

export const internalApiRouter = t.router({
  ensureUser: t.procedure
    .input(
      z
        .object({
          superTokensUserId: z.string().min(1),
          email: z.string().min(1),
          oidcIntegrationId: z.union([z.string(), z.null()]),
          firstName: z.string().min(1).nullable(),
          lastName: z.string().min(1).nullable(),
        })
        .required(),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.storage.ensureUserExists({
        ...input,
        oidcIntegration: input.oidcIntegrationId
          ? {
              id: input.oidcIntegrationId,
              defaultScopes: oidcDefaultScopes,
            }
          : null,
      });

      return result;
    }),
  getOIDCIntegrationById: t.procedure
    .input(
      z.object({
        oidcIntegrationId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (z.string().uuid().safeParse(input.oidcIntegrationId).success === false) {
        return null;
      }

      const result = await ctx.storage.getOIDCIntegrationById({
        oidcIntegrationId: input.oidcIntegrationId,
      });

      if (result == null) {
        return null;
      }

      return {
        id: result.id,
        clientId: result.clientId,
        clientSecret: ctx.crypto.decrypt(result.encryptedClientSecret),
        tokenEndpoint: result.tokenEndpoint,
        userinfoEndpoint: result.userinfoEndpoint,
        authorizationEndpoint: result.authorizationEndpoint,
      };
    }),
});

export const createInternalApiCaller = t.createCallerFactory(internalApiRouter);

export type InternalApi = typeof internalApiRouter;
