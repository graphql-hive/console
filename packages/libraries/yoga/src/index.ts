import {
  ASTNode,
  DocumentNode,
  ExecutionArgs,
  GraphQLError,
  GraphQLSchema,
  Kind,
  parse,
} from 'graphql';
import { _createLRUCache, YogaServer, type GraphQLParams, type Plugin } from 'graphql-yoga';
import {
  addHiveTypenames,
  autoDisposeSymbol,
  CollectUsage,
  createHive as createHiveClient,
  hideInjectedTypenames,
  HiveClient,
  HivePluginOptions,
  isAsyncIterable,
  isHiveClient,
} from '@graphql-hive/core';
import { Logger } from '@graphql-hive/logger';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { version } from './version.js';

export {
  atLeastOnceSampler,
  createSchemaFetcher,
  createServicesFetcher,
  createSupergraphSDLFetcher,
} from '@graphql-hive/core';
export type { SupergraphSDLFetcherOptions } from '@graphql-hive/core';

type CacheRecord = {
  callback: CollectUsage;
  paramsArgs: GraphQLParams;
  executionArgs?: ExecutionArgs;
  /**
   * Unmodified document. This is used in usage tracking to
   * generate a cache key (and therefore operation key) that is identical
   * to what exists in prior versions.
   */
  parsedDocument?: DocumentNode;
  /** persisted document id */
  documentId?: string;
};

export type YogaPluginOptions = HivePluginOptions & {
  /**
   * Size of document cache. This is used to store a transformed version of the operation
   * because abstract types must include a __typename. Default: 10_000
   */
  cache?: number;
};

export function createHive(clientOrOptions: YogaPluginOptions) {
  return createHiveClient({
    ...clientOrOptions,
    agent: {
      name: 'hive-client-yoga',
      version,
      ...clientOrOptions.agent,
    },
  });
}

export function useHive(clientOrOptions: HiveClient): Plugin;
export function useHive(clientOrOptions: YogaPluginOptions): Plugin;
export function useHive(clientOrOptions: HiveClient | YogaPluginOptions): Plugin {
  const parsedDocumentCache = _createLRUCache<DocumentNode>();
  let latestSchema: GraphQLSchema | null = null;
  const contextualCache = new WeakMap<object, CacheRecord>();

  let hive: HiveClient;
  let yoga: YogaServer<any, any>;
  let onYogaInit: () => void;
  let onYogaInitDefered: Promise<void> | null = new Promise<void>(
    res =>
      (onYogaInit = () => {
        res();
        onYogaInitDefered = null;
      }),
  );
  const fieldLevelMetricsEnabled = isHiveClient(clientOrOptions)
    ? false
    : (typeof clientOrOptions.usage === 'object' &&
        clientOrOptions.usage?.fieldLevelMetricsEnabled) ||
      false;
  const operationCache = fieldLevelMetricsEnabled
    ? _createLRUCache<DocumentNode | true>({
        max: isHiveClient(clientOrOptions) ? 10_000 : (clientOrOptions.cache ?? 10_000),
      })
    : null;

  return {
    onYogaInit(payload) {
      yoga = payload.yoga;
      onYogaInit();
    },
    onSchemaChange({ schema }) {
      hive.reportSchema({ schema });
      latestSchema = schema;
      operationCache?.clear();
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
    // Capture the original parsed document before execution plugins transform it,
    // so usage reporting reflects the client operation.
    onParse(parseCtx) {
      return ctx => {
        const result = ctx.result as ASTNode;
        if (result.kind === Kind.DOCUMENT) {
          const record = contextualCache.get(ctx.context);
          if (record) {
            // set the documents on thee operation context to be used in other callbacks
            record.parsedDocument = result;
            parsedDocumentCache.set(parseCtx.params.source, result);
          }
        }
      };
    },
    onExecute({ args, executeFn, setExecuteFn }) {
      const record = contextualCache.get(args.contextValue);

      if (fieldLevelMetricsEnabled && operationCache && latestSchema) {
        // Validation must run against the client document. Add the metadata fields only
        // to the document passed to execution and cache that transformed document.
        const query = record?.paramsArgs.query || args.document.loc?.source.body;
        const cachedDocument = query ? operationCache.get(query) : undefined;
        const modifiedDocument =
          cachedDocument === true
            ? args.document
            : cachedDocument || addHiveTypenames(args.document, latestSchema);

        if (query && cachedDocument === undefined) {
          operationCache.set(query, args.document === modifiedDocument || modifiedDocument);
        }
        if (args.document !== modifiedDocument) {
          setExecuteFn(executionArgs =>
            executeFn({ ...executionArgs, document: modifiedDocument }),
          );
        }
      }

      return {
        onExecuteDone({ args, result }) {
          if (!record) {
            return;
          }

          record.executionArgs = args;

          if (!isAsyncIterable(result)) {
            if (result.data && fieldLevelMetricsEnabled) {
              hideInjectedTypenames(result.data);
            }

            args.contextValue.waitUntil(
              record.callback.finish(
                {
                  ...record.executionArgs,
                  // pass the original parsed document to the callback so the operation name and structure match the original
                  document: record.parsedDocument ?? record.executionArgs.document,
                },
                result,
                record.documentId,
              ),
            );
            return;
          }

          const errors: GraphQLError[] = [];

          return {
            onNext(ctx) {
              if (ctx.result.data && fieldLevelMetricsEnabled) {
                hideInjectedTypenames(ctx.result.data);
              }
              if (!ctx.result.errors) {
                return;
              }
              errors.push(...ctx.result.errors);
            },
            onEnd() {
              args.contextValue.waitUntil(
                record.callback.finish(
                  {
                    ...args,
                    // pass the original parsed document to the callback so the operation name and structure match the original
                    document:
                      record.parsedDocument ?? record.executionArgs?.document ?? args.document,
                  },
                  errors.length ? { errors } : {},
                  record.documentId,
                ),
              );
            },
          };
        },
      };
    },
    onSubscribe(context) {
      // In GraphQL.js 16 `onSubscribe` is called even if the schema does not contain a subscription type.
      // In GraphQL.js 17 there is a new validation rule [`KnownOperationTypes`](https://github.com/graphql/graphql-js/pull/3601)
      // that prevents `onSubscribe` being called if the schema has no subscription type.
      // We want to avoid running SDK code here as it would raise an exception in the schema coordinate collection.
      if (!context.args.schema.getSubscriptionType()) {
        return;
      }
      const record = contextualCache.get(context.args.contextValue);

      return {
        onSubscribeResult() {
          const persistedDocumentId = record?.documentId;
          hive.collectSubscriptionUsage({
            args: {
              ...context.args, // spread the context because the record might not have all the necessary fields
              ...record?.executionArgs,
              document:
                record?.parsedDocument ?? record?.executionArgs?.document ?? context.args.document,
            },
            experimental__persistedDocumentHash: persistedDocumentId,
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
            record.callback.finish(
              {
                document,
                schema: latestSchema,
                variableValues: record.paramsArgs.variables,
                operationName: record.paramsArgs.operationName,
                contextValue: serverContext,
              },
              result,
              record.documentId,
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
            logger:
              clientOrOptions.logger ??
              new Logger({
                writers: [
                  {
                    write(level, attrs, msg) {
                      level = level === 'trace' ? 'debug' : level;
                      if (!onYogaInitDefered) {
                        yoga.logger[level](msg, attrs);

                        return;
                      }
                      // Defer logs until yoga instance is initialized
                      // Ideally, onPluginInit would provide us access to the logger instance
                      // See https://github.com/graphql-hive/graphql-yoga/issues/4048#issuecomment-3576258603
                      void onYogaInitDefered.then(() => {
                        yoga?.logger[level](msg, attrs);
                      });
                    },
                  },
                ],
              }),
            agent: clientOrOptions.agent
              ? {
                  // Hive Plugin should respect the given FetchAPI, note that this is not `yoga.fetch`
                  fetch: (...args) => yoga.fetchAPI.fetch(...args),
                  ...clientOrOptions.agent,
                }
              : undefined,
          });
      void hive.info();
      const persistedDocuments = hive.persistedDocuments;
      if (persistedDocuments) {
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
              let document: string | null;
              try {
                document = await persistedDocuments.resolve(key, {
                  waitUntil: context.waitUntil,
                });
              } catch (error) {
                if (
                  error &&
                  typeof error === 'object' &&
                  'code' in error &&
                  error.code === 'INVALID_DOCUMENT_ID' &&
                  'message' in error &&
                  typeof error.message === 'string'
                ) {
                  throw new GraphQLError(error.message, {
                    extensions: { code: 'INVALID_DOCUMENT_ID' },
                  });
                }
                throw error;
              }
              // after we resolve the document we need to update the cache record to contain the resolved document
              if (document) {
                const record = contextualCache.get(context);
                if (record) {
                  record.documentId = key;
                  record.paramsArgs = {
                    ...record.paramsArgs,
                    query: document,
                  };
                }
              }
              return document;
            },
            allowArbitraryOperations(request) {
              return persistedDocuments.allowArbitraryDocuments(request);
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
