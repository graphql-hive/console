import { type FastifyBaseLogger, type RouteHandlerMethod } from 'fastify';
import { createYoga, useExecutionCancellation, useExtendContext, useSchema } from 'graphql-yoga';
import { useGraphQLModules } from '@envelop/graphql-modules';
import { useHive } from '@graphql-hive/yoga';
import { type Registry } from '@hive/api';
import { type AuthN } from '@hive/api/modules/auth/lib/authz';
import { cleanRequestId, TracingInstance } from '@hive/service-common';
import { runWithAsyncContext } from '@sentry/node';
import { asyncStorage } from './async-storage';
import { type HiveUsageConfig } from './environment';
import {
  reqIdGenerate,
  useHiveErrorHandler,
  useHiveSentry,
  useHiveTracing,
  type Context,
} from './graphql-handler';
import { createPublicGraphQLSchema } from './public-graphql-schema';
import { useArmor } from './use-armor';

type CreatePublicGraphQLHandlerArgs = {
  registry: Registry;
  logger: FastifyBaseLogger;
  authN: AuthN;
  hiveUsageConfig: HiveUsageConfig;
  tracing?: TracingInstance;
};

export const createPublicGraphQLHandler = (
  args: CreatePublicGraphQLHandlerArgs,
): RouteHandlerMethod => {
  const publicSchema = createPublicGraphQLSchema<Context>(args.registry);
  const server = createYoga<Context>({
    logging: args.logger,
    plugins: [
      useArmor(),
      useHiveSentry(),
      useGraphQLModules(args.registry),
      useSchema(publicSchema),
      useExtendContext(async context => ({
        session: await args.authN.authenticate(context),
      })),
      useHiveErrorHandler(error => {
        server.logger.error(error);
      }),
      useHive({
        debug: true,
        enabled: !!args.hiveUsageConfig,
        token: args.hiveUsageConfig?.token ?? '',
        usage: args.hiveUsageConfig
          ? {
              target: args.hiveUsageConfig.target,
              endpoint: args.hiveUsageConfig.endpoint ?? undefined,
              clientInfo: () => ({
                name: 'hive-public-api',
                version: '0.1',
              }),
            }
          : false,
      }),
      args.tracing ? useHiveTracing(args.tracing.traceProvider()) : {},
      useExecutionCancellation(),
    ],
    graphqlEndpoint: '/graphql-public',
  });

  return async (req, reply) => {
    const requestIdHeader = req.headers['x-request-id'] ?? reqIdGenerate();
    const requestId = cleanRequestId(requestIdHeader);

    await asyncStorage.run(
      {
        requestId,
      },
      async () => {
        const response = await runWithAsyncContext(() => {
          return server.handleNodeRequestAndResponse(req, reply, {
            req,
            reply,
            headers: req.headers,
            requestId,
          });
        });

        response.headers.forEach((value, key) => {
          void reply.header(key, value);
        });

        if (!reply.hasHeader('x-request-id')) {
          void reply.header('x-request-id', requestId || '');
        }

        const accept = req.headers.accept;

        if (!accept || accept === '*/*') {
          void reply.header('content-type', 'application/json');
        }

        void reply.status(response.status);
        void reply.send(response.body);

        return reply;
      },
    );
  };
};
