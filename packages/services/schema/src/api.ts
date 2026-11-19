import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { handleTRPCError } from '@hive/service-common';
import type { inferRouterInputs } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { SchemaDiffInput } from '../../api/src/modules/schema/lib/schema-diff';
import type { Cache } from './cache';
import type { CompositionScheduler } from './composition-scheduler';
import type { CompositionResultEvent } from './composition-worker';
import { type ComposeFederationArgs } from './composition/federation';
import type { CompositionErrorType } from './composition/shared';
import { ComposeSingleArgs } from './composition/single';
import { ComposeStitchingArgs } from './composition/stitching';
import { DiffInputModel, resolveDiffInput, type DiffResponse } from './diff';
import { composeAndValidateCounter, schemaDiffCounter } from './metrics';
import type { Metadata } from './types';

export type { CompositionFailureError, CompositionErrorSource } from './lib/errors';
export type { DiffInput, DiffResponse, SdlRef, SerializedSchemaChange } from './diff';

export interface Context {
  req: FastifyRequest;
  cache: Cache;
  broker: {
    endpoint: string;
    signature: string;
  } | null;
  compositionScheduler: CompositionScheduler;
  /** Runs diffs in separate workers, so they do not queue behind compositions. */
  diffScheduler: CompositionScheduler;
}

const t = initTRPC.context<Context>().create();

const procedure = t.procedure.use(handleTRPCError);

const ExternalValidationModel = z
  .object({
    endpoint: z.url().min(1),
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
          external: ExternalValidationModel,
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
                },
                abortSignal,
                requestId: ctx.req.id,
              });
              return expectCompositionResult(result);
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
              return expectCompositionResult(result);
            },
          )({ schemas: input.schemas });
        }

        if (input.type === 'single') {
          return await ctx.cache.reuse('single', async (args: ComposeSingleArgs, abortSignal) => {
            const result = await ctx.compositionScheduler.process({
              data: {
                type: 'single',
                args,
              },
              abortSignal,
              requestId: ctx.req.id,
            });
            return expectCompositionResult(result);
          })({ schemas: input.schemas });
        }

        assertAllCasesExhausted(input);
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ERR_WORKER_OUT_OF_MEMORY'
        ) {
          ctx.req.log.error('Composition memory limit exceeded. (error=%o)', error);

          return {
            errors: [
              {
                message:
                  'Composition exceeded resource limits. Please contact the Hive Console Team.',
                source: 'composition',
                code: 'ERR_WORKER_OUT_OF_MEMORY',
              },
            ],
            sdl: null,
            supergraph: null,
            includesNetworkError: false,
            includesException: true,
            contracts: null,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          } satisfies CompositionResponse;
        }

        // Treat timeouts caused by external composition as "expected errors"
        if (ctx.cache.isTimeoutError(error)) {
          ctx.req.log.error('Composition timed out. (error=%s)', error);
          return {
            errors: [
              {
                message: 'The composition timed out. Please try again later.',
                source: 'composition',
              },
            ],
            sdl: null,
            supergraph: null,
            includesNetworkError: false,
            includesException: true,
            contracts: null,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          } satisfies CompositionResponse;
        }

        ctx.req.log.error({ err: error }, 'Unexpected composition error.');
        throw error;
      }

      throw new Error('tRCP and TypeScript for the win.');
    }),
  /**
   * Computes the changes between two schemas.
   * Classifying the changes (usage data, approvals, app deployments) is up to the caller.
   */
  diff: procedure.input(DiffInputModel).mutation(async ({ ctx, input }): Promise<DiffResponse> => {
    schemaDiffCounter.inc({ source: input.source });

    return await ctx.cache.reuse('diff', async (args: SchemaDiffInput, abortSignal) => {
      const result = await ctx.diffScheduler.process({
        data: {
          type: 'diff',
          args,
        },
        abortSignal,
        requestId: ctx.req.id,
      });
      return expectDiffResult(result);
    })(resolveDiffInput(input));
  }),
});

export type SchemaBuilderApi = typeof schemaBuilderApiRouter;
export type SchemaBuilderApiInput = inferRouterInputs<SchemaBuilderApi>;

function expectCompositionResult(data: CompositionResultEvent['data']): CompositionResponse {
  if (data.type === 'diff') {
    throw new Error('Expected a composition result, received a diff result.');
  }
  return data.result;
}

function expectDiffResult(data: CompositionResultEvent['data']): DiffResponse {
  if (data.type !== 'diff') {
    throw new Error('Expected a diff result, received a composition result.');
  }
  return data.result;
}

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
  includesException?: boolean;
};
