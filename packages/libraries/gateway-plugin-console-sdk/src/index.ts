import {
  GraphQLSchema,
  OperationTypeNode,
  responsePathAsArray,
  type DocumentNode,
  type GraphQLError,
} from 'graphql';
import { lru } from 'tiny-lru';
import {
  addHiveTypenames,
  createHive as createHiveClient,
  getDefinedRootType,
  hideInjectedTypenames,
  isAsyncIterable,
  isHiveClient,
  type HiveClient,
  type HivePluginOptions,
} from '@graphql-hive/core';
import { GatewayPlugin } from '@graphql-hive/gateway-runtime';
import { isEntityRequest } from './is-entity-request.js';
import { version } from './version.js';

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
  /** stores the resulting status from fetches */
  const statusMap = new WeakMap<object, number>();
  const fieldLevelMetricsEnabled = isHiveClient(clientOrOptions)
    ? false
    : (typeof clientOrOptions.usage === 'object' &&
        clientOrOptions.usage?.fieldLevelMetricsEnabled) ||
      false;
  /** stores the original query SDL to avoid having to print */
  const operationCache = fieldLevelMetricsEnabled
    ? lru<DocumentNode | true>(
        isHiveClient(clientOrOptions) ? 10_000 : (clientOrOptions.cache ?? 10_000),
      )
    : null;

  let latestSchema: GraphQLSchema | null = null;

  return {
    onFetch({ executionRequest }) {
      /** Only if the execution request is set, then this is a subgraph execution. */
      if (!executionRequest) {
        return;
      }

      return function onFetchDone({ response }) {
        statusMap.set(executionRequest, response.status);
      };
    },

    onSubgraphExecute({ executionRequest, subgraphName, subgraph: subgraphSchema }) {
      if (!fieldLevelMetricsEnabled) {
        // short circuit the entire hook to avoid processing this data.
        return;
      }

      const collection = executionRequest.context?.__hiveUsageCollection as
        | ReturnType<HiveClient['collectUsage']>
        | undefined;

      if (!collection) {
        // This is set onExecute so this should exist... but just to be safe
        return;
      }

      /**
       * Note that we need __typename on every abstract type in the subgraph call.
       * This is added in the "onExecute" hook to the entire document. So subgraph
       * calls should also include this field.
       */
      const finishSubRequest = collection.subrequest({
        subgraph: subgraphName,
        type: isEntityRequest(executionRequest.document) ? 'ENTITY' : 'ROOT',
        /** @NOTE this field's format supports batched requests, but onSubgraphExecute does not. */
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
    onExecute({ args, executeFn, setExecuteFn }) {
      const collection = hive.collectUsage();

      // Inject the collection object into the GraphQL context
      // so it can be accessed downstream by subgraph executions.
      if (args.contextValue) {
        (args.contextValue as any).__hiveUsageCollection = collection;
      }

      if (fieldLevelMetricsEnabled && operationCache && latestSchema) {
        // Validation must run against the client document. Add the metadata fields only
        // to the document passed to execution and cache that transformed document.
        const query = args.document.loc?.source.body;
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
        onExecuteDone({ result }) {
          if (!isAsyncIterable(result)) {
            if (result.data && fieldLevelMetricsEnabled) {
              hideInjectedTypenames(result.data);
            }
            void collection.finish(args, result);
            return;
          }

          const errors: GraphQLError[] = [];
          return {
            onNext({ result }) {
              if (result.data && fieldLevelMetricsEnabled) {
                hideInjectedTypenames(result.data);
              }
              if (result.errors) {
                errors.push(...result.errors);
              }
            },
            onEnd() {
              void collection.finish(args, errors.length ? { errors } : {});
            },
          };
        },
      };
    },
    onSubscribe({ args }) {
      hive.collectSubscriptionUsage({ args });
    },
    onDispose: async () => {
      await hive.dispose();
    },
  };
}
