import { GraphQLError, type DocumentNode } from 'graphql';
import type { ApolloServerPlugin, HTTPGraphQLRequest } from '@apollo/server';
import {
  autoDisposeSymbol,
  createCDNArtifactFetcher,
  createHive as createHiveClient,
  HiveClient,
  HivePluginOptions,
  isHiveClient,
  joinUrl,
  type CircuitBreakerConfiguration,
} from '@graphql-hive/core';
import { Logger } from '@graphql-hive/logger';
import { version } from './version.js';

export {
  atLeastOnceSampler,
  createSchemaFetcher,
  createServicesFetcher,
  createSupergraphSDLFetcher,
} from '@graphql-hive/core';

/** @deprecated Use {CreateSupergraphManagerArgs} instead */
export type { SupergraphSDLFetcherOptions } from '@graphql-hive/core';

/**
 * Configuration for {createSupergraphManager}.
 */
export type CreateSupergraphManagerArgs = {
  /**
   * The artifact endpoint to poll.
   * E.g. `https://cdn.graphql-hive.com/<uuid>/supergraph`
   */
  endpoint: string | [string, string];
  /**
   * The CDN access key for fetching artifact.
   */
  key: string;
  logger?: Logger;
  /**
   * The supergraph poll interval in milliseconds
   * Default: 30_000
   */
  pollIntervalInMs?: number;
  /** Circuit breaker configuration override. */
  circuitBreaker?: CircuitBreakerConfiguration;
  fetchImplementation?: typeof fetch;
  /**
   * Client name override
   * Default: `@graphql-hive/apollo`
   */
  name?: string;
  /**
   * Client version override
   * Default: currents package version
   */
  version?: string;
};

export function createSupergraphManager(args: CreateSupergraphManagerArgs) {
  const logger = args.logger ?? new Logger({ level: false });
  const pollIntervalInMs = args.pollIntervalInMs ?? 30_000;
  let endpoints = Array.isArray(args.endpoint) ? args.endpoint : [args.endpoint];

  const endpoint = endpoints.map(endpoint =>
    endpoint.endsWith('/supergraph') ? endpoint : joinUrl(endpoint, 'supergraph'),
  );

  const artifactsFetcher = createCDNArtifactFetcher({
    endpoint: endpoint as [string, string],
    accessKey: args.key,
    client: {
      name: args.name ?? '@graphql-hive/apollo',
      version: args.version ?? version,
    },
    logger,
    fetch: args.fetchImplementation,
    circuitBreaker: args.circuitBreaker,
  });

  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    async initialize(hooks: { update(supergraphSdl: string): void }): Promise<{
      supergraphSdl: string;
      cleanup?: () => Promise<void>;
    }> {
      const initialResult = await artifactsFetcher.fetch();

      function poll() {
        timer = setTimeout(async () => {
          try {
            const result = await artifactsFetcher.fetch();
            if (result.contents) {
              hooks.update?.(result.contents);
            }
          } catch (error) {
            logger.error({ error }, `Failed to update supergraph.`);
          }
          poll();
        }, pollIntervalInMs);
      }

      poll();

      return {
        supergraphSdl: initialResult.contents,
        cleanup: async () => {
          if (timer) {
            clearTimeout(timer);
          }
          artifactsFetcher.dispose();
        },
      };
    },
  };
}

function addRequestWithHeaders(context: any, http?: HTTPGraphQLRequest) {
  if (!!http && !('request' in context)) {
    context.request = {
      headers: http.headers,
    };
  }

  return context;
}

export function createHive(clientOrOptions: HivePluginOptions) {
  return createHiveClient({
    ...clientOrOptions,
    agent: {
      name: 'hive-client-yoga',
      version,
      ...clientOrOptions.agent,
    },
  });
}

export function useHive(clientOrOptions: HiveClient | HivePluginOptions): ApolloServerPlugin {
  const hive = isHiveClient(clientOrOptions) ? clientOrOptions : createHive(clientOrOptions);

  void hive.info();

  return {
    requestDidStart(context) {
      // `overallCachePolicy` does not exist in v0
      const isLegacyV0 = !('overallCachePolicy' in context);
      // `context` does not exist in v4, it is `contextValue` instead
      const isLegacyV3 = 'context' in context;

      let doc: DocumentNode;
      let didResolveSource = false;
      const complete = hive.collectUsage();
      const args = {
        schema: context.schema,
        get document() {
          return doc;
        },
        operationName: context.operationName,
        contextValue: addRequestWithHeaders(
          isLegacyV3 ? context.context : context.contextValue,
          context.request?.http,
        ),
        variableValues: context.request.variables,
      };

      if (isLegacyV0) {
        return {
          didResolveSource() {
            didResolveSource = true;
          },
          willSendResponse(ctx: any) {
            if (!didResolveSource) {
              void complete(args, {
                action: 'abort',
                reason: 'Did not resolve source',
                logging: false,
              });
              return;
            }
            doc = ctx.document;
            void complete(args, ctx.response);
          },
        } as any;
      }

      let didFailValidation = false;

      if (isLegacyV3) {
        return Promise.resolve({
          didResolveSource() {
            didResolveSource = true;
          },
          async validationDidStart() {
            return function onErrors(errors) {
              if (errors === null || errors === void 0 ? void 0 : errors.length) {
                didFailValidation = true;
              }
            };
          },
          async willSendResponse(ctx) {
            if (didFailValidation) {
              void complete(args, {
                action: 'abort',
                reason: 'Validation failed',
                logging: false,
              });
              return;
            }
            if (!didResolveSource) {
              void complete(args, {
                action: 'abort',
                reason: 'Did not resolve source',
                logging: false,
              });
              return;
            }

            if (!ctx.document) {
              const details = ctx.operationName ? `operationName: ${ctx.operationName}` : '';
              void complete(args, {
                action: 'abort',
                reason: 'Document is not available' + (details ? ` (${details})` : ''),
                logging: true,
              });
              return;
            }

            doc = ctx.document!;
            void complete(args, ctx.response as any);
          },
        });
      }

      return (async () => {
        let persistedDocumentError: GraphQLError | null = null;
        let persistedDocumentHash: string | undefined;

        if (hive.experimental__persistedDocuments) {
          if (
            context.request.http?.body &&
            typeof context.request.http.body === 'object' &&
            'documentId' in context.request.http.body &&
            typeof context.request.http.body.documentId === 'string'
          ) {
            persistedDocumentHash = context.request.http.body.documentId;
            try {
              const document = await hive.experimental__persistedDocuments.resolve(
                context.request.http.body.documentId,
              );

              if (document) {
                context.request.query = document;
              } else {
                // Document not found - this is also a client error (400)
                context.request.query = '{__typename}';
                persistedDocumentError = new GraphQLError('Persisted document not found.', {
                  extensions: {
                    code: 'PERSISTED_DOCUMENT_NOT_FOUND',
                    http: {
                      status: 400,
                    },
                  },
                });
              }
            } catch (error: any) {
              // Check if this is a client error (400-range status) - preserve the error
              if (error?.status >= 400 && error?.status < 500) {
                context.request.query = '{__typename}';
                // Use the original error's extensions if available, otherwise create basic ones
                const extensions = {
                  ...error?.extensions,
                  code: error?.code || 'CLIENT_ERROR',
                  http: {
                    status: error?.status || 400,
                  },
                };
                persistedDocumentError = new GraphQLError(error.message || 'Client error.', {
                  extensions,
                });
              } else {
                // Re-throw server errors (500+ status) - these should remain as server errors
                throw error;
              }
            }
          } else if (
            false ===
            (await hive.experimental__persistedDocuments.allowArbitraryDocuments({
              headers: {
                get(name: string) {
                  return context.request.http?.headers?.get(name) ?? null;
                },
              },
            }))
          ) {
            context.request.query = '{__typename}';
            persistedDocumentError = new GraphQLError('No persisted document provided.', {
              extensions: {
                code: 'PERSISTED_DOCUMENT_REQUIRED',
                http: {
                  status: 400,
                },
              },
            });
          }
        }

        // v4
        return {
          didResolveSource() {
            didResolveSource = true;
          },
          async validationDidStart() {
            return function onErrors(errors) {
              if (errors?.length) {
                didFailValidation = true;
              }
            };
          },
          didResolveOperation() {
            if (persistedDocumentError) {
              throw persistedDocumentError;
            }
          },
          async willSendResponse(ctx) {
            if (didFailValidation) {
              void complete(
                args,
                {
                  action: 'abort',
                  reason: 'Validation failed',
                  logging: false,
                },
                persistedDocumentHash,
              );
              return;
            }
            if (!didResolveSource) {
              void complete(
                args,
                {
                  action: 'abort',
                  reason: 'Did not resolve source',
                  logging: false,
                },
                persistedDocumentHash,
              );
              return;
            }

            if (!ctx.document) {
              const details = ctx.operationName ? `operationName: ${ctx.operationName}` : '';
              void complete(
                args,
                {
                  action: 'abort',
                  reason: 'Document is not available' + (details ? ` (${details})` : ''),
                  logging: true,
                },
                persistedDocumentHash,
              );
              return;
            }

            doc = ctx.document;
            if (ctx.response.body.kind === 'incremental') {
              void complete(
                args,
                {
                  action: 'abort',
                  reason: '@defer and @stream is not supported by Hive',
                  logging: true,
                },
                persistedDocumentHash,
              );
            } else {
              void complete(args, ctx.response.body.singleResult, persistedDocumentHash);
            }
          },
        };
      })();
    },
    serverWillStart(ctx) {
      // `engine` does not exist in v3
      const isLegacyV0 = 'engine' in ctx;

      hive.reportSchema({ schema: ctx.schema });

      if (isLegacyV0) {
        return {
          async serverWillStop() {
            if (hive[autoDisposeSymbol]) {
              await hive.dispose();
            }
          },
        } as any;
      }

      // Works on v3 and v4

      return Promise.resolve({
        async serverWillStop() {
          if (hive[autoDisposeSymbol]) {
            await hive.dispose();
          }
        },
        schemaDidLoadOrUpdate(schemaContext) {
          if (ctx.schema !== schemaContext.apiSchema) {
            hive.reportSchema({ schema: schemaContext.apiSchema });
          }
        },
      });
    },
  };
}
