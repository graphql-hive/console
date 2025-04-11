import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { handleTRPCError } from '@hive/service-common';
import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Cache } from './cache';
import { createComposeFederation, type ComposeFederationArgs } from './composition/federation';
import type { CompositionErrorType } from './composition/shared';
import { composeSingle } from './composition/single';
import { createComposeStitching } from './composition/stitching';
import { composeAndValidateCounter } from './metrics';

export type { CompositionFailureError, CompositionErrorSource } from './lib/errors';

export interface Context {
  req: FastifyRequest;
  cache: Cache;
  decrypt(value: string): string;
  broker: {
    endpoint: string;
    signature: string;
  } | null;
}

const t = initTRPC.context<Context>().create();

const procedure = t.procedure.use(handleTRPCError);

const EXTERNAL_VALIDATION = z
  .object({
    endpoint: z.string().url().min(1),
    encryptedSecret: z.string().min(1),
  })
  .nullable();

const ContractsInputModel = z.array(
  z.object({
    id: z.string(),
    filter: z.object({
      include: z.array(z.string()).nullable(),
      exclude: z.array(z.string()).nullable(),
      removeUnreachableTypesFromPublicApiSchema: z.boolean(),
    }),
  }),
);

export type ContractsInputType = z.TypeOf<typeof ContractsInputModel>;

export const schemaBuilderApiRouter = t.router({
  composeAndValidate: procedure
    .input(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('single'),
          schemas: z.array(
            z.object({
              raw: z.string().min(1),
              source: z.string().min(1),
            }),
          ),
        }),
        z.object({
          type: z.literal('federation'),
          schemas: z.array(
            z
              .object({
                raw: z.string().min(1),
                source: z.string().min(1),
                url: z.string().nullish(),
              })
              .required(),
          ),
          external: EXTERNAL_VALIDATION,
          native: z.boolean().optional(),
          contracts: ContractsInputModel.nullable().optional(),
        }),
        z.object({
          type: z.literal('stitching'),
          schemas: z.array(
            z.object({
              raw: z.string().min(1),
              source: z.string().min(1),
              url: z.string().nullish(),
            }),
          ),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      composeAndValidateCounter.inc({ type: input.type });
      try {
        if (input.type === 'federation') {
          return await ctx.cache.reuse(
            'federation',
            async (args: ComposeFederationArgs) => {
              const composed = await createComposeFederation({
                logger: ctx.req.log,
                decrypt: ctx.decrypt,
                requestTimeoutMs: ctx.cache.timeoutMs,
              })({
                ...args,
                requestId: ctx.req.id,
              });

              return {
                errors: composed.result.errors ?? [],
                sdl: composed.result.sdl ?? null,
                supergraph: composed.result.supergraph ?? null,
                includesNetworkError: composed.result.includesNetworkError === true,
                contracts:
                  composed.result.contracts?.map(contract => ({
                    id: contract.id,
                    errors: 'errors' in contract.result.result ? contract.result.result.errors : [],
                    sdl: contract.result.result.sdl ?? null,
                    supergraph: contract.result.result.supergraph ?? null,
                  })) ?? null,
                tags: composed.result.tags ?? null,
                schemaMetadata: composed.result.schemaMetadata ?? null,
                metadataAttributes: composed.result.metadataAttributes ?? null,
                includesException: composed.result.includesException === true,
              };
            },
            result =>
              result.includesNetworkError === true || result.includesException === true
                ? 'short'
                : 'long',
          )({
            schemas: input.schemas,
            external:
              'external' in input && input.external
                ? {
                    ...input.external,
                    broker: ctx.broker,
                  }
                : null,
            native: 'native' in input && input.native ? true : false,
            contracts: 'contracts' in input && input.contracts ? input.contracts : undefined,
            requestId: ctx.req.id,
          });
        }

        if (input.type === 'stitching') {
          return await ctx.cache.reuse('stitching', createComposeStitching())(input.schemas);
        }

        if (input.type === 'single') {
          return await ctx.cache.reuse('single', composeSingle)({ schemas: input.schemas });
        }

        assertAllCasesExhausted(input);
      } catch (error) {
        if (ctx.cache.isTimeoutError(error)) {
          return {
            errors: [
              {
                message: error.message,
                source: 'graphql',
              },
            ] satisfies Array<CompositionErrorType>,
            sdl: null,
            supergraph: null,
            includesNetworkError: true,
            contracts: null,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          };
        }
        throw error;
      }

      throw new Error('tRCP and TypeScript for the win.');
    }),
});

export type SchemaBuilderApi = typeof schemaBuilderApiRouter;
export type SchemaBuilderApiInput = inferRouterInputs<SchemaBuilderApi>;

function assertAllCasesExhausted(value: never) {
  throw new Error(`Not all cases are exhaused. Value '${value}'.`);
}
