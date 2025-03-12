import { type FastifyBaseLogger, type RouteHandlerMethod } from 'fastify';
import { createYoga, useSchema, type Plugin as YogaPlugin } from 'graphql-yoga';
import { useGraphQLModules } from '@envelop/graphql-modules';
import { type Registry } from '@hive/api';
import { type Context } from './graphql-handler';
import { createPublicGraphQLSchema } from './public-graphql-schema';
import { useArmor } from './use-armor';

type CreatePublicGraphQLHandlerArgs = {
  registry: Registry;
  logger: FastifyBaseLogger;
};

export const createPublicGraphQLHandler = (
  args: CreatePublicGraphQLHandlerArgs,
): RouteHandlerMethod => {
  const publicSchema = createPublicGraphQLSchema<Context>(args.registry);
  const server = createYoga<Context>({
    logging: args.logger,
    plugins: [useArmor(), useGraphQLModules(args.registry), useSchema(publicSchema)],
    graphqlEndpoint: '/test',
  });

  return async (req, reply) => {
    const response = await server.handleNodeRequestAndResponse(req, reply, {
      req,
      reply,
      headers: req.headers,
    });

    response.headers.forEach((value, key) => {
      void reply.header(key, value);
    });

    const accept = req.headers.accept;

    if (!accept || accept === '*/*') {
      void reply.header('content-type', 'application/json');
    }

    void reply.status(response.status);
    void reply.send(response.body);

    return reply;
  };
};
