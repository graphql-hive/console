import { responsePathAsArray, type GraphQLError } from 'graphql';
import {
  autoDisposeSymbol,
  createHive as createHiveClient,
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
      name: 'hive-client-yoga',
      version,
      ...clientOrOptions.agent,
    },
  });
}

export type GatewayPluginOptions = HivePluginOptions & {
  /** Opt in to sending subgraph metrics. This feature is  */
  fieldLevelMetricsEnabled?: boolean;
};

export function useHive(clientOrOptions: HiveClient): GatewayPlugin;
export function useHive(clientOrOptions: GatewayPluginOptions): GatewayPlugin;
export function useHive(clientOrOptions: HiveClient | GatewayPluginOptions): GatewayPlugin {
  const hive = isHiveClient(clientOrOptions)
    ? clientOrOptions
    : createHive({
        ...clientOrOptions,
        agent: {
          name: 'hive-client-envelop',
          ...clientOrOptions.agent,
        },
      });

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

  const fieldLevelMetricsEnabled = isHiveClient(clientOrOptions)
    ? false
    : (clientOrOptions.fieldLevelMetricsEnabled ?? false);
  return {
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

      const finishSubRequest = collection.subrequest({
        subgraph: subgraphName,
        type: isEntityRequest(executionRequest.document) ? 'ENTITY' : 'ROOT',
        /** @NOTE this field's format supports batched requests, but onSubgraphExecute does not. */
        paths: executionRequest.info?.path
          ? [responsePathAsArray(executionRequest.info.path).join('.')]
          : [],
      });

      return function onSubgraphExecuteDone({ result }) {
        if (!isAsyncIterable(result)) {
          finishSubRequest({
            status: 200 /** @TODO figure out how to capture HTTP status codes */,
            subgraphSchema,
            result,
            document: executionRequest.document,
          });
        }
      };
    },
    onSchemaChange({ schema }) {
      hive.reportSchema({ schema });
    },
    onExecute({ args }) {
      const collection = hive.collectUsage();

      // Inject the collection object into the GraphQL context
      // so it can be accessed downstream by subgraph executions.
      if (args.contextValue) {
        (args.contextValue as any).__hiveUsageCollection = collection;
      }

      return {
        onExecuteDone({ result }) {
          if (!isAsyncIterable(result)) {
            void collection.finish(args, result);
            return;
          }

          const errors: GraphQLError[] = [];
          return {
            onNext(ctx) {
              if (ctx.result.errors) {
                errors.push(...ctx.result.errors);
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
  };
}
