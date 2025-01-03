import { DocumentNode, ExecutionArgs, GraphQLError, GraphQLSchema, Kind, parse } from 'graphql';
import { _createLRUCache, YogaServer, type GraphQLParams, type Plugin } from 'graphql-yoga';
import {
  autoDisposeSymbol,
  CollectUsageCallback,
  createHive as createHiveClient,
  HiveClient,
  HivePluginOptions,
  isAsyncIterable,
  isHiveClient,
} from '@graphql-hive/core';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';

export {
  atLeastOnceSampler,
  createSchemaFetcher,
  createServicesFetcher,
  createSupergraphSDLFetcher,
} from '@graphql-hive/core';
export type { SupergraphSDLFetcherOptions } from '@graphql-hive/core';

type CacheRecord = {
  callback: CollectUsageCallback;
  paramsArgs: GraphQLParams;
  executionArgs?: ExecutionArgs;
  parsedDocument?: DocumentNode;
  /** persisted document id */
  experimental__documentId?: string;
};

export function createHive(clientOrOptions: HivePluginOptions) {
  return createHiveClient({
    ...clientOrOptions,
    agent: {
      name: 'hive-client-yoga',
      ...clientOrOptions.agent,
    },
  });
}

export function useHive(clientOrOptions: HiveClient): Plugin;
export function useHive(clientOrOptions: HivePluginOptions): Plugin;
export function useHive(clientOrOptions: HiveClient | HivePluginOptions): Plugin {
  const parsedDocumentCache = _createLRUCache<DocumentNode>();
  let latestSchema: GraphQLSchema | null = null;
  const contextualCache = new WeakMap<object, CacheRecord>();

  let hive: HiveClient;
  let yoga: YogaServer<any, any>;
  return {
    onYogaInit(payload) {
      yoga = payload.yoga;
    },
    onSchemaChange({ schema }) {
      hive.reportSchema({ schema });
      latestSchema = schema;
    },
    onParams(context) {
      // we set the params if there is either a query or documentId in the request
      if ((context.params.query || 'documentId' in context.params) && latestSchema) {
        contextualCache.set(context.context, {
          callback: hive.collectUsage(),
          paramsArgs: context.params,
        });
      }
    },
    // since response-cache modifies the executed GraphQL document, we need to extract it after parsing.
    onParse(parseCtx) {
      return ctx => {
        if (ctx.result.kind === Kind.DOCUMENT) {
          const record = contextualCache.get(ctx.context);
          if (record) {
            record.parsedDocument = ctx.result;
            parsedDocumentCache.set(parseCtx.params.source, ctx.result);
          }
        }
      };
    },
    onExecute() {
      return {
        onExecuteDone({ args, result }) {
          const record = contextualCache.get(args.contextValue);
          if (!record) {
            return;
          }

          record.executionArgs = args;

          if (!isAsyncIterable(result)) {
            args.contextValue.waitUntil(
              record.callback(
                {
                  ...record.executionArgs,
                  document: record.parsedDocument ?? record.executionArgs.document,
                },
                result,
                record.experimental__documentId,
              ),
            );
            return;
          }

          const errors: GraphQLError[] = [];

          return {
            onNext(ctx) {
              if (!ctx.result.errors) {
                return;
              }
              errors.push(...ctx.result.errors);
            },
            onEnd() {
              args.contextValue.waitUntil(
                record.callback(
                  args,
                  errors.length ? { errors } : {},
                  record.experimental__documentId,
                ),
              );
            },
          };
        },
      };
    },
    onSubscribe(context) {
      const record = contextualCache.get(context.args.contextValue);

      return {
        onSubscribeResult() {
          const experimental__persistedDocumentHash = record?.experimental__documentId;
          hive.collectSubscriptionUsage({
            args: context.args,
            experimental__persistedDocumentHash,
          });
        },
      };
    },
    onResultProcess({ serverContext, result }) {
      const record = contextualCache.get(serverContext);

      if (!record || Array.isArray(result) || isAsyncIterable(result) || record.executionArgs) {
        return;
      }

      // Report if execution was skipped due to response cache ( Symbol.for('servedFromResponseCache') in context.result)
      if (
        record.paramsArgs.query &&
        latestSchema &&
        Symbol.for('servedFromResponseCache') in result
      ) {
        try {
          let document = parsedDocumentCache.get(record.paramsArgs.query);
          if (document === undefined) {
            document = parse(record.paramsArgs.query);
            parsedDocumentCache.set(record.paramsArgs.query, document);
          }
          serverContext.waitUntil(
            record.callback(
              {
                document,
                schema: latestSchema,
                variableValues: record.paramsArgs.variables,
                operationName: record.paramsArgs.operationName,
              },
              result,
              record.experimental__documentId,
            ),
          );
        } catch (err) {
          yoga.logger.error(err);
        }
      }
    },
    onPluginInit({ addPlugin }) {
      hive = isHiveClient(clientOrOptions)
        ? clientOrOptions
        : createHive({
            ...clientOrOptions,
            agent: clientOrOptions.agent
              ? {
                  logger: {
                    // Hive Plugin should respect the given Yoga logger
                    error: (...args) => yoga.logger.error(...args),
                    info: (...args) => yoga.logger.info(...args),
                  },
                  // Hive Plugin should respect the given FetchAPI, note that this is not `yoga.fetch`
                  fetch: (...args) => yoga.fetchAPI.fetch(...args),
                  ...clientOrOptions.agent,
                }
              : undefined,
          });
      void hive.info();
      const experimentalPersistedDocs = hive.experimental__persistedDocuments;
      if (experimentalPersistedDocs) {
        addPlugin(
          usePersistedOperations({
            extractPersistedOperationId(body, request) {
              if ('documentId' in body && typeof body.documentId === 'string') {
                return body.documentId;
              }

              const documentId = new URL(request.url).searchParams.get('documentId');

              if (documentId) {
                return documentId;
              }

              return null;
            },
            async getPersistedOperation(key, _request, context) {
              const document = await experimentalPersistedDocs.resolve(key);
              // after we resolve the document we need to update the cache record to contain the resolved document
              if (document) {
                const record = contextualCache.get(context);
                if (record) {
                  record.experimental__documentId = key;
                  record.paramsArgs = {
                    ...record.paramsArgs,
                    query: document,
                  };
                }
              }
              return document;
            },
            allowArbitraryOperations(request) {
              return experimentalPersistedDocs.allowArbitraryDocuments(request);
            },
            customErrors: {
              keyNotFound() {
                return new GraphQLError('Persisted document not found.', {
                  extensions: { code: 'PERSISTED_DOCUMENT_NOT_FOUND' },
                });
              },
              notFound() {
                return new GraphQLError('Persisted document not found.', {
                  extensions: { code: 'PERSISTED_DOCUMENT_NOT_FOUND' },
                });
              },
              persistedQueryOnly() {
                return new GraphQLError('No persisted document provided.', {
                  extensions: { code: 'PERSISTED_DOCUMENT_REQUIRED' },
                });
              },
            },
          }),
        );
      }
    },
    onDispose() {
      if (hive[autoDisposeSymbol]) {
        return hive.dispose();
      }
    },
  };
}
