import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { handleTRPCError } from '@hive/service-common';
import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Cache } from './cache';
import type { CompositionScheduler } from './composition-scheduler';
import { type ComposeFederationArgs } from './composition/federation';
import type { CompositionErrorType } from './composition/shared';
import { ComposeStitchingArgs } from './composition/stitching';
import { composeAndValidateCounter } from './metrics';
import type { Metadata } from './types';

export type { CompositionFailureError, CompositionErrorSource } from './lib/errors';

export interface Context {
  req: FastifyRequest;
  cache: Cache;
  broker: {
    endpoint: string;
    signature: string;
  } | null;
  compositionScheduler: CompositionScheduler;
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
    .mutation(async ({ ctx, input }): Promise<CompositionResponse> => {
      composeAndValidateCounter.inc({ type: input.type });

      try {
        if (input.type === 'federation') {
          return await ctx.cache.reuse(
            'federation',
            async (args: ComposeFederationArgs, abortSignal) => {
              const result = await ctx.compositionScheduler.process({
                data: {
                  type: 'federation',
                  args,
                  requestTimeoutMs: ctx.cache.timeoutMs,
                },
                abortSignal,
                requestId: ctx.req.id,
              });
              return result.result;
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
          return await ctx.cache.reuse(
            'stitching',
            async (args: ComposeStitchingArgs, abortSignal) => {
              const result = await ctx.compositionScheduler.process({
                data: {
                  type: 'stitching',
                  args,
                },
                abortSignal,
                requestId: ctx.req.id,
              });
              return result.result;
            },
          )({ schemas: input.schemas });
        }

        if (input.type === 'single') {
          const result = await ctx.compositionScheduler.process({
            data: {
              type: 'single',
              args: { schemas: input.schemas },
            },
            abortSignal: new AbortSignal(),
            requestId: ctx.req.id,
          });
          return result.result;
        }

        assertAllCasesExhausted(input);
      } catch (error) {
        // Treat timeouts caused by external composition as "expected errors"
        if (ctx.cache.isTimeoutError(error) && input.type === 'federation' && input.external) {
          return {
            errors: [
              {
                message: error.message,
                source: 'graphql',
              },
            ],
            sdl: null,
            supergraph: null,
            includesNetworkError: true,
            contracts: null,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          } satisfies CompositionResponse;
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

export type CompositionResponse = {
  errors: Array<CompositionErrorType>;
  sdl: null | string;
  supergraph: null | string;
  contracts: Array<{
    id: string;
    errors: Array<CompositionErrorType>;
    sdl: string | null;
    supergraph: string | null;
  }> | null;
  schemaMetadata: Record<string, Metadata[]> | null;
  metadataAttributes: Record<string, string[]> | null;
  tags: Array<string> | null;
  includesNetworkError?: boolean;
};
