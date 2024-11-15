import { DocumentNode, ExecutionArgs, GraphQLError, GraphQLSchema, Kind, parse } from 'graphql';
import type { GraphQLParams, Plugin } from 'graphql-yoga';
import LRU from 'tiny-lru';
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
  const hive = isHiveClient(clientOrOptions) ? clientOrOptions : createHive(clientOrOptions);

  void hive.info();

  if (hive[autoDisposeSymbol]) {
    if (global.process) {
      const signals = Array.isArray(hive[autoDisposeSymbol])
        ? hive[autoDisposeSymbol]
        : ['SIGINT', 'SIGTERM'];
      for (const signal of signals) {
        process.once(signal, () => hive.dispose());
      }
    } else {
      console.error(
        'It seems that GraphQL Hive is not being executed in Node.js. ' +
          'Please attempt manual client disposal and use autoDispose: false option.',
      );
    }
  }

  const parsedDocumentCache = LRU<DocumentNode>(10_000);
  let latestSchema: GraphQLSchema | null = null;
  const contextualCache = new WeakMap<object, CacheRecord>();

  return {
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
            void record.callback(
              {
                ...record.executionArgs,
                document: record.parsedDocument ?? record.executionArgs.document,
              },
              result,
              record.experimental__documentId,
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
              void record.callback(
                args,
                errors.length ? { errors } : {},
                record.experimental__documentId,
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
    onResultProcess(context) {
      const record = contextualCache.get(context.serverContext);

      if (
        !record ||
        Array.isArray(context.result) ||
        isAsyncIterable(context.result) ||
        record.executionArgs
      ) {
        return;
      }

      // Report if execution was skipped due to response cache ( Symbol.for('servedFromResponseCache') in context.result)
      if (
        record.paramsArgs.query &&
        latestSchema &&
        Symbol.for('servedFromResponseCache') in context.result
      ) {
        try {
          let document = parsedDocumentCache.get(record.paramsArgs.query);
          if (document === undefined) {
            document = parse(record.paramsArgs.query);
            parsedDocumentCache.set(record.paramsArgs.query, document);
          }
          void record.callback(
            {
              document,
              schema: latestSchema,
              variableValues: record.paramsArgs.variables,
              operationName: record.paramsArgs.operationName,
            },
            context.result,
            record.experimental__documentId,
          );
        } catch (err) {
          console.error(err);
        }
      }
    },
    onPluginInit({ addPlugin }) {
      const { experimental__persistedDocuments } = hive;
      if (!experimental__persistedDocuments) {
        return;
      }
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
          async getPersistedOperation(key, request, context) {
            const document = await experimental__persistedDocuments.resolve(key);
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
            return experimental__persistedDocuments.allowArbitraryDocuments({
              headers: request.headers,
            });
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
    },
  };
}
