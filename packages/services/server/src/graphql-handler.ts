import { createHash } from 'node:crypto';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { GraphQLError, print, ValidationContext, ValidationRule } from 'graphql';
import {
  createYoga,
  Plugin,
  useErrorHandler,
  useExecutionCancellation,
  useExtendContext,
} from 'graphql-yoga';
import hyperid from 'hyperid';
import { isGraphQLError } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { useGraphQLModules } from '@envelop/graphql-modules';
import { useOpenTelemetry } from '@graphql-hive/plugin-opentelemetry';
import { hive, trace } from '@graphql-hive/plugin-opentelemetry/api';
import { useHive } from '@graphql-hive/yoga';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { Registry, RegistryContext } from '@hive/api';
import { SuperTokensCookieBasedSession } from '@hive/api/modules/auth/lib/supertokens-strategy';
import { cleanRequestId, type TracingInstance } from '@hive/service-common';
import { captureException, runWithAsyncContext, withScope } from '@sentry/node';
import { AuthN, Session } from '../../api/src/modules/auth/lib/authz';
import { asyncStorage } from './async-storage';
import type { HivePersistedDocumentsConfig, HiveUsageConfig } from './environment';
import { useArmor } from './use-armor';

export const reqIdGenerate = hyperid({ fixedLength: true });

function hashSessionId(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex');
}

export interface GraphQLHandlerOptions {
  graphiqlEndpoint: string;
  registry: Registry;
  signature: string;
  tracing?: TracingInstance;
  supertokens: {
    connectionUri: string;
    apiKey: string;
  };
  isProduction: boolean;
  hiveUsageConfig: HiveUsageConfig;
  hivePersistedDocumentsConfig: HivePersistedDocumentsConfig;
  release: string;
  logger: FastifyBaseLogger;
  authN: AuthN;
}

export interface Context extends RegistryContext {
  req: FastifyRequest;
  reply: FastifyReply;
  session: Session;
}

const NoIntrospection: ValidationRule = (context: ValidationContext) => ({
  Field(node) {
    if (node.name.value === '__schema' || node.name.value === '__type') {
      context.reportError(
        new GraphQLError('GraphQL introspection is not allowed', {
          nodes: [node],
        }),
      );
    }
  },
});

function hasFastifyRequest(ctx: unknown): ctx is {
  req: FastifyRequest;
} {
  return !!ctx && typeof ctx === 'object' && 'req' in ctx;
}

export function useHiveErrorHandler(fallbackHandler: (err: Error) => void): Plugin {
  return useErrorHandler(({ errors, context }): void => {
    // Not sure what changed, but the `context` is now an object with a contextValue property.
    // We previously relied on the `context` being the `contextValue` itself.
    const ctx = ('contextValue' in context ? context.contextValue : context) as Context;

    function reportError(error: GraphQLError | Error) {
      withScope(scope => {
        const userId = (ctx.session as SuperTokensCookieBasedSession | null)?.userId;

        scope.setTransactionName(context.operationName ?? 'unknown graphql operation');
        scope.setContext('Extra Info', {
          operationName: context.operationName,
          variables: JSON.stringify(context.variableValues),
          operation: print(context.document),
          userId,
        });

        scope.setUser({
          id: userId ?? undefined,
        });

        scope.setTags({
          supertokens_user_id: (ctx.session as SuperTokensCookieBasedSession | null)
            ?.superTokensUserId,
          hive_user_id: userId,
          request_id: ctx.requestId,
        });

        captureException((error as any).originalError ?? error, {
          originalException: (error as any).originalError ?? error,
        });
      });
    }

    for (const error of errors) {
      if (isGraphQLError(error)) {
        console.error(error);
        console.error(error.originalError);

        // If the original error is a graphql error, we don't need to report it
        // it is an expected error
        if (!isGraphQLError(error.originalError)) {
          reportError(error as any as GraphQLError);
        }
        continue;
      } else {
        console.error(error);
        reportError(error);
      }

      if (hasFastifyRequest(ctx)) {
        ctx.req.log.error(error);
      } else {
        fallbackHandler(error);
      }
    }
  });
}

function useNoIntrospection(params: {
  signature: string;
  isNonProductionEnvironment: boolean;
}): Plugin<{ req: FastifyRequest }> {
  return {
    onValidate({ context, addValidationRule }) {
      const isReadinessCheck = context.req.headers['x-signature'] === params.signature;
      if (isReadinessCheck || params.isNonProductionEnvironment) {
        return;
      }
      addValidationRule(NoIntrospection);
    },
  };
}

export function useHiveTracing(): Plugin {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOpenTelemetry({
          traces: {
            spans: {
              http: ({ request }) => request.headers.get('x-hive-tracing') !== 'ignore',
            },
          },
        }) as Plugin,
      );
    },
    onParams({ params: { variables }, context }) {
      const otelCtx = hive.getOperationContext(context);
      const operationSpan = otelCtx && trace.getSpan(otelCtx);

      if (operationSpan && variables && typeof variables === 'object' && 'selector' in variables) {
        operationSpan?.setAttribute('hive.variables.selector', JSON.stringify(variables.selector));
      }
    },
  };
}

export const graphqlHandler = (options: GraphQLHandlerOptions): RouteHandlerMethod => {
  const server = createYoga<Context>({
    logging: options.logger,
    plugins: [
      useArmor(),
      useHiveErrorHandler(error => {
        server.logger.error(error);
      }),
      useExtendContext(async context => ({
        session: await options.authN.authenticate(context),
      })),
      useHive({
        debug: true,
        enabled: !!options.hiveUsageConfig,
        token: options.hiveUsageConfig?.token ?? '',
        usage: options.hiveUsageConfig
          ? {
              target: options.hiveUsageConfig.target,
              endpoint: options.hiveUsageConfig.endpoint ?? undefined,
              clientInfo(ctx: { req: FastifyRequest; reply: FastifyReply }) {
                const name = ctx.req.headers['graphql-client-name'] as string;
                const version = (ctx.req.headers['graphql-client-version'] as string) ?? 'missing';

                if (name) {
                  return { name, version };
                }

                return null;
              },
              exclude: ['readiness'],
            }
          : false,
        experimental__persistedDocuments: options.hivePersistedDocumentsConfig
          ? {
              cdn: {
                endpoint: options.hivePersistedDocumentsConfig.cdnEndpoint,
                accessToken: options.hivePersistedDocumentsConfig.cdnAccessKeyId,
              },
              allowArbitraryDocuments: true,
              cache: 50_000,
            }
          : undefined,
      }),
      useResponseCache({
        session: request => {
          const sessionValue =
            request.headers.get('authorization') ?? request.headers.get('x-api-token');

          if (sessionValue != null) {
            return hashSessionId(sessionValue);
          }

          return null;
        },
        ttl: 0,
        ttlPerSchemaCoordinate: {
          'Query.tokenInfo': 5_000 /* 5 seconds */,
        },
        invalidateViaMutation: false,
      }),
      useGraphQLModules(options.registry),
      useNoIntrospection({
        signature: options.signature,
        isNonProductionEnvironment: options.isProduction === false,
      }),
      useGraphQlJit(
        {},
        {
          enableIf(args) {
            if (hasFastifyRequest(args.contextValue)) {
              // Enable JIT only for Hive App
              const name = args.contextValue.req.headers['graphql-client-name'] as string;

              return name === 'Hive App';
            }

            return false;
          },
          onError(r) {
            options.logger.error(r);
          },
        },
      ),
      options.tracing ? useHiveTracing() : {},
      useExecutionCancellation(),
    ],
    graphiql: !options.isProduction,
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
