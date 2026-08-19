import {
  ExecutionArgs,
  GraphQLSchema,
  OperationTypeNode,
  parse,
  responsePathAsArray,
  type DocumentNode,
  type GraphQLError,
} from 'graphql';
import type { GraphQLHTTPExtensions } from 'graphql-yoga';
import type { ExecutionResultWithSerializer } from 'graphql-yoga/typings/plugins/types.js';
import { lru } from 'tiny-lru';
import {
  addHiveTypenames,
  CollectUsage,
  createHive as createHiveClient,
  getDefinedRootType,
  hideInjectedTypenames,
  HiveClient,
  HivePluginOptions,
  isAsyncIterable,
  isHiveClient,
} from '@graphql-hive/core';
import type { GatewayPlugin } from '@graphql-hive/gateway-runtime';
import { isEntityRequest } from './is-entity-request.js';
import { version } from './version.js';

export {
  atLeastOnceSampler,
  createSchemaFetcher,
  createServicesFetcher,
  createSupergraphSDLFetcher,
} from '@graphql-hive/core';
export type { SupergraphSDLFetcherOptions } from '@graphql-hive/core';

export function createHive(clientOrOptions: HivePluginOptions) {
  return createHiveClient({
    ...clientOrOptions,
    agent: {
      name: 'hive-client-gateway-sdk',
      version,
      ...clientOrOptions.agent,
    },
  });
}

export type GatewayPluginOptions = HivePluginOptions & {
  /**
   * Size of document cache. This is used to store a transformed version of the operation
   * because abstract types must include a __typename. Default: 10_000
   */
  cache?: number;
};

type CacheRecord = {
  collector: CollectUsage;
  paramsArgs: Record<string, any>;
  document?: DocumentNode;
  executionArgs?: ExecutionArgs;
  experimental__documentId?: string;
};

export function useHive(clientOrOptions: HiveClient): GatewayPlugin;
export function useHive(clientOrOptions: GatewayPluginOptions): GatewayPlugin;
export function useHive(clientOrOptions: HiveClient | GatewayPluginOptions): GatewayPlugin {
  const hive = isHiveClient(clientOrOptions)
    ? clientOrOptions
    : createHive({
        ...clientOrOptions,
        agent: {
          name: 'hive-client-gateway-sdk',
          ...clientOrOptions.agent,
        },
      });

  void hive.info();

  const contextualCache = new WeakMap<object, CacheRecord>();
  const statusMap = new WeakMap<object, number>();

  const fieldLevelMetricsEnabled = isHiveClient(clientOrOptions)
    ? false
    : (typeof clientOrOptions.usage === 'object' &&
        clientOrOptions.usage?.fieldLevelMetricsEnabled) ||
      false;

  const operationCache = fieldLevelMetricsEnabled
    ? lru<DocumentNode | true>(
        isHiveClient(clientOrOptions) ? 10_000 : (clientOrOptions.cache ?? 10_000),
      )
    : null;

  let latestSchema: GraphQLSchema | null = null;

  return {
    onFetch({ executionRequest }) {
      if (!executionRequest) {
        return;
      }

      return function onFetchDone({ response }) {
        statusMap.set(executionRequest, response.status);
      };
    },

    onSubgraphExecute({ executionRequest, subgraphName, subgraph: subgraphSchema }) {
      if (!fieldLevelMetricsEnabled || !executionRequest.context) {
        return;
      }
      const cache = contextualCache.get(executionRequest.context);
      if (!cache) {
        return;
      }

      const finishSubRequest = cache.collector.subrequest({
        subgraph: subgraphName,
        type: isEntityRequest(executionRequest.document) ? 'ENTITY' : 'ROOT',
        paths: executionRequest.info?.path
          ? [responsePathAsArray(executionRequest.info.path).join('.')]
          : getDefinedRootType(
              subgraphSchema,
              executionRequest.operationType ?? OperationTypeNode.QUERY,
            )?.name,
      });

      return function onSubgraphExecuteDone({ result }) {
        if (!isAsyncIterable(result)) {
          finishSubRequest({
            status: statusMap.get(executionRequest) ?? 200,
            subgraphSchema,
            result,
            // The Rust query planner generates and caches this document up front.
            // This depends on the operation and variables.
            // So if we need to add typenames to the request, it needs to happen
            // here also. E.g. `addHiveTypenames(executionRequest.document, subgraphSchema)`.
            // But for the js gateway execution, this is redundant and an unnecessary expense.
            document: executionRequest.document,
          });
        }
      };
    },

    onSchemaChange({ schema }) {
      hive.reportSchema({ schema });
      latestSchema = schema;
      operationCache?.clear();
    },

    onParams(context) {
      if ((context.params.query || 'documentId' in context.params) && latestSchema) {
        contextualCache.set(context.context, {
          collector: hive.collectUsage(),
          paramsArgs: context.params,
        });
      }
    },

    onExecute({ args, context, setExecuteFn, executeFn }) {
      const ctx = args.contextValue || context;
      const cache = contextualCache.get(ctx);
      if (!cache) return;

      cache.executionArgs = args;

      if (fieldLevelMetricsEnabled && operationCache && latestSchema) {
        // Validation must run against the client document. Add the metadata fields only
        // to the document passed to execution and cache that transformed document.
        const query = args.document.loc?.source.body;
        const cachedDocument = query ? operationCache.get(query) : undefined;
        const modifiedDocument =
          cachedDocument === true
            ? (args.document as DocumentNode)
            : cachedDocument || addHiveTypenames(args.document, latestSchema);

        if (query && cachedDocument === undefined) {
          operationCache.set(query, args.document === modifiedDocument || modifiedDocument);
        }
        if (args.document !== modifiedDocument) {
          setExecuteFn(executionArgs =>
            executeFn({ ...executionArgs, document: modifiedDocument }),
          );
        }
        cache.document = modifiedDocument;
      }

      return {
        onExecuteDone({ result, args }) {
          if (!isAsyncIterable(result)) {
            if (result.errors) {
              const gatewayErrors = result.errors?.filter(
                e =>
                  e.extensions?.code !== 'DOWNSTREAM_SERVICE_ERROR' && !e.extensions?.subgraphName,
              );
              if (cache && gatewayErrors?.length > 0) {
                console.dir(result.errors);
                cache.collector.trackGatewayErrors({ errors: gatewayErrors });
              }
            }

            args.contextValue.waitUntil(
              cache.collector.finish(
                args,
                // {
                //   ...args,
                //   document: ctx.document ?? args.document,
                // },
                result,
                cache.experimental__documentId,
              ),
            );
            return;
          }

          const errors: GraphQLError[] = [];
          return {
            onNext({ result: iterResult }) {
              if (iterResult.errors) {
                errors.push(...iterResult.errors);
              }
            },
            onEnd() {
              ctx.waitUntil(
                cache.collector.finish(
                  args,
                  // {
                  //   ...args,
                  //   document: cache.document ?? args.document,
                  // },
                  // how to pass in data here?
                  errors.length ? { errors } : {},
                  cache.experimental__documentId,
                ),
              );
            },
          };
        },
      };
    },

    onSubscribe({ args, context }) {
      const ctx = args.contextValue || context;
      const record = contextualCache.get(ctx);

      return {
        onSubscribeResult() {
          const experimental__persistedDocumentHash = record?.experimental__documentId;
          hive.collectSubscriptionUsage({
            args,
            // args: {
            //   ...args,
            //   document: record?.executionArgs?.document ?? args.document,
            // },
            experimental__persistedDocumentHash,
          });
        },
      };
    },

    async onResultProcess({ serverContext, result, setResult }) {
      const record = contextualCache.get(serverContext);

      if (!record || Array.isArray(result) || isAsyncIterable(result) || record.executionArgs) {
        if (fieldLevelMetricsEnabled) {
          if (isAsyncIterable(result)) {
            const modifyStream = async function* (): AsyncIterable<
              ExecutionResultWithSerializer<
                any,
                {
                  http?: GraphQLHTTPExtensions;
                }
              >
            > {
              for await (const r of result) {
                hideInjectedTypenames(r.data);
                yield r;
              }
            };
            setResult(modifyStream());
          } else if (Array.isArray(result)) {
            for (let r of result) {
              hideInjectedTypenames(r.data);
            }
          } else {
            hideInjectedTypenames(result.data);
          }
        }
        return;
      }

      if (record.paramsArgs.query && latestSchema) {
        try {
          let doc = record.document;
          if (!doc) {
            doc = parse(record.paramsArgs.query);
          }

          serverContext.waitUntil(
            record.collector.finish(
              {
                document: doc,
                schema: latestSchema,
                variableValues: record.paramsArgs.variables,
                operationName: record.paramsArgs.operationName,
                contextValue: serverContext,
              },
              result,
              record.experimental__documentId,
            ),
          );
        } catch (err) {
          // Fail silently if parse fails inside cached block handling
        }
      }

      if (fieldLevelMetricsEnabled) {
        hideInjectedTypenames(result.data);
      }
    },

    onDispose() {
      return hive.dispose();
    },
  };
}
