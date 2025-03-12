import { type FastifyBaseLogger, type RouteHandlerMethod } from 'fastify';
import { createYoga, useExecutionCancellation, useExtendContext, useSchema } from 'graphql-yoga';
import { useGraphQLModules } from '@envelop/graphql-modules';
import { type Registry } from '@hive/api';
import { type AuthN } from '@hive/api/modules/auth/lib/authz';
import { cleanRequestId, TracingInstance } from '@hive/service-common';
import { runWithAsyncContext } from '@sentry/node';
import { asyncStorage } from './async-storage';
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
      // TODO: Hive usage reporting
      args.tracing ? useHiveTracing() : {},
      useExecutionCancellation(),
    ],
    graphqlEndpoint: '/test',
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
