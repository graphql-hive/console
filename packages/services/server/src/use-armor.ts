import type { ParseOptions, Source, ValidationRule } from 'graphql';
import { createGraphQLError, type Plugin } from 'graphql-yoga';
import promClient from 'prom-client';
import { maxAliasesRule } from '@escape.tech/graphql-armor-max-aliases';
import { maxDepthRule } from '@escape.tech/graphql-armor-max-depth';
import { maxDirectivesRule } from '@escape.tech/graphql-armor-max-directives';
import { MaxTokensParserWLexer } from '@escape.tech/graphql-armor-max-tokens';
import * as Sentry from '@sentry/node';

const rejectedRequests = new promClient.Counter({
  name: 'graphql_armor_rejected_requests',
  help: 'Number of failed graphql requests',
  labelNames: ['reason'],
});

// prom client metric for tracking the number of failed requests and their user agents
const failedClientRequests = new promClient.Counter({
  name: 'graphql_armor_hive_client_rejections',
  help: 'Number of failed graphql requests sent from hive clients',
  labelNames: ['clientVersion', 'reason'],
});

const getHiveClientVersion = (userAgent: string | null) => {
  if (userAgent === null) {
    return null;
  }
  const match = userAgent.match(/hive-client\/([0-9.]+)/);
  return match ? match[1] : null;
};

const reservedTypenameAliases = new Set([
  '__hive_typename__',
  '__responseCacheTypeName',
  '__responseCacheId',
]);

const DisallowReservedAliasesRule: ValidationRule = context => {
  return {
    Field(field) {
      if (field.alias?.value && reservedTypenameAliases.has(field.alias.value)) {
        context.reportError(createGraphQLError(`The alias "${field.alias.value}" cannot be used.`));
      }
    },
  };
};

export function useArmor<
  PluginContext extends Record<string, any> = object,
  TServerContext extends Record<string, any> = object,
  TUserContext = object,
>(): Plugin<PluginContext, TServerContext, TUserContext> {
  return {
    onValidate(ctx) {
      const hiveClientVersion = getHiveClientVersion(ctx.context.request.headers.get('user-agent'));

      ctx.addValidationRule(DisallowReservedAliasesRule);

      ctx.addValidationRule(
        maxAliasesRule({
          n: 20,
          allowList: [],
          onReject: [
            (context, error) => {
              context?.reportError(error);
              rejectedRequests.inc({
                reason: 'maxAliases',
              });

              if (hiveClientVersion) {
                failedClientRequests.inc({
                  clientVersion: hiveClientVersion,
                  reason: 'maxAliases',
                });

                Sentry.captureException(error, {
                  level: 'fatal',
                });
              }
            },
          ],
          propagateOnRejection: false,
        }),
      );
      ctx.addValidationRule(
        maxDirectivesRule({
          n: 20,
          onReject: [
            (context, error) => {
              context?.reportError(error);
              rejectedRequests.inc({
                reason: 'maxDirectives',
              });

              if (hiveClientVersion) {
                failedClientRequests.inc({
                  clientVersion: hiveClientVersion,
                  reason: 'maxDirectives',
                });

                Sentry.captureException(error, {
                  level: 'fatal',
                });
              }
            },
          ],
          propagateOnRejection: false,
        }),
      );
      ctx.addValidationRule(
        maxDepthRule({
          n: 22,
          flattenFragments: true,
          ignoreIntrospection: true,
          onReject: [
            (context, error) => {
              context?.reportError(error);
              rejectedRequests.inc({
                reason: 'maxDepth',
              });

              if (hiveClientVersion) {
                failedClientRequests.inc({
                  clientVersion: hiveClientVersion,
                  reason: 'maxDepth',
                });

                Sentry.captureException(error, {
                  level: 'fatal',
                });
              }
            },
          ],
          propagateOnRejection: false,
        }),
      );
    },
    onParse(ctx) {
      function parseWithTokenLimit(source: string | Source, options: ParseOptions) {
        let tokenLimitError = null as Error | null;
        const parser = new MaxTokensParserWLexer(source, {
          ...options,
          n: 800,
          onReject: [
            (_, error) => {
              tokenLimitError = error;
              rejectedRequests.inc({
                reason: 'maxTokenCount',
              });
              const hiveClientVersion = getHiveClientVersion(
                ctx.context.request.headers.get('user-agent'),
              );

              if (hiveClientVersion) {
                failedClientRequests.inc({
                  clientVersion: hiveClientVersion,
                  reason: 'maxTokenCount',
                });

                Sentry.captureException(error, {
                  level: 'fatal',
                });
              }
            },
          ],
        });

        try {
          return parser.parseDocument();
        } catch (error) {
          if (tokenLimitError && error === tokenLimitError) {
            throw createGraphQLError(tokenLimitError.message, {
              extensions: {
                http: {
                  spec: true,
                  status: 400,
                },
              },
            });
          }
          throw error;
        }
      }

      ctx.setParseFn(parseWithTokenLimit);
    },
  };
}
