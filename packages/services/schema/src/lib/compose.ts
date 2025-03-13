import { createHmac } from 'node:crypto';
import got, { RequestError } from 'got';
import { DocumentNode, GraphQLError, parse, print, printSchema } from 'graphql';
import { validateSDL } from 'graphql/validation/validate.js';
import { z } from 'zod';
import { composeAndValidate, compositionHasErrors } from '@apollo/federation';
import type { ErrorCode } from '@graphql-hive/external-composition';
import { ServiceLogger, SpanKind, trace } from '@hive/service-common';
import * as Sentry from '@sentry/node';
import {
  composeServices as nativeComposeServices,
  compositionHasErrors as nativeCompositionHasErrors,
  transformSupergraphToPublicSchema,
} from '@theguild/federation-composition';
import type { Cache } from '../cache';
import type { ExternalComposition } from '../types';
import { toValidationError } from './errors';

interface BrokerPayload {
  method: 'POST';
  url: string;
  headers: {
    [key: string]: string;
    'x-hive-signature-256': string;
  };
  body: string;
}

const EXTERNAL_COMPOSITION_RESULT = z.union([
  z.object({
    type: z.literal('success'),
    result: z.object({
      supergraph: z.string(),
      sdl: z.string(),
    }),
    includesNetworkError: z.boolean().optional().default(false),
  }),
  z.object({
    type: z.literal('failure'),
    result: z.object({
      supergraph: z.string().optional(),
      sdl: z.string().optional(),
      errors: z.array(
        z.object({
          message: z.string(),
          source: z
            .union([z.literal('composition'), z.literal('graphql')])
            .optional()
            .transform(value => value ?? 'graphql'),
        }),
      ),
    }),
    includesNetworkError: z.boolean().optional().default(false),
  }),
]);

export type ComposerMethodResult = z.TypeOf<typeof EXTERNAL_COMPOSITION_RESULT>;

export function composeFederationV1(
  subgraphs: Array<{
    typeDefs: DocumentNode;
    name: string;
    url: string | undefined;
  }>,
): ComposerMethodResult {
  const result = composeAndValidate(subgraphs);

  if (compositionHasErrors(result)) {
    return {
      type: 'failure',
      result: {
        errors: result.errors.map(errorWithPossibleCode),
        sdl: result.schema ? printSchema(result.schema) : undefined,
      },
      includesNetworkError: false,
    };
  }

  return {
    type: 'success',
    result: {
      supergraph: result.supergraphSdl,
      sdl: printSchema(result.schema),
    },
    includesNetworkError: false,
  };
}

export type SubgraphInput = {
  typeDefs: DocumentNode;
  name: string;
  url: string | undefined;
};

export function composeFederationV2(
  subgraphs: Array<SubgraphInput>,
  logger?: ServiceLogger,
): ComposerMethodResult & {
  includesException?: boolean;
} {
  try {
    const result = nativeComposeServices(subgraphs);

    if (nativeCompositionHasErrors(result)) {
      return {
        type: 'failure',
        result: {
          errors: result.errors.map(errorWithPossibleCode),
          sdl: undefined,
        },
        includesNetworkError: false,
      } as const;
    }

    return {
      type: 'success',
      result: {
        supergraph: result.supergraphSdl,
        sdl: print(transformSupergraphToPublicSchema(parse(result.supergraphSdl))),
      },
      includesNetworkError: false,
    } as const;
  } catch (error) {
    logger?.error(error);
    Sentry.captureException(error);

    return {
      type: 'failure',
      result: {
        errors: [
          {
            message: 'Unexpected composition error.',
            source: 'composition',
          },
        ],
        sdl: undefined,
      },
      includesNetworkError: false,
      includesException: true,
    } as const;
  }
}

export async function composeExternalFederation(args: {
  logger: ServiceLogger;
  subgraphs: Array<SubgraphInput>;
  decrypt: (value: string) => string;
  external: Exclude<ExternalComposition, null>;
  cache: Cache;
  requestId: string;
}): Promise<ComposerMethodResult> {
  args.logger.debug(
    'Using external composition service (url=%s, schemas=%s)',
    args.external.endpoint,
    args.subgraphs.length,
  );
  const body = JSON.stringify(
    args.subgraphs.map(subgraph => {
      return {
        sdl: print(subgraph.typeDefs),
        name: subgraph.name,
        url: 'url' in subgraph && typeof subgraph.url === 'string' ? subgraph.url : undefined,
      };
    }),
  );

  const signature = hash(args.decrypt(args.external.encryptedSecret), 'sha256', body);
  args.logger.debug(
    'Calling external composition service (url=%s, broker=%s)',
    args.external.endpoint,
    args.external.broker ? 'yes' : 'no',
  );

  const request = {
    url: args.external.endpoint,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-hive-signature-256': signature,
    } as const,
    body,
  };

  const externalResponse = await (args.external.broker
    ? callExternalServiceViaBroker(
        args.external.broker,
        {
          method: 'POST',
          ...request,
        },
        args.logger,
        args.cache.timeoutMs,
        args.requestId,
      )
    : callExternalService(request, args.logger, args.cache.timeoutMs));

  args.logger.debug('Got response from external composition service, trying to safe parse');
  const parseResult = EXTERNAL_COMPOSITION_RESULT.safeParse(externalResponse);

  if (!parseResult.success) {
    args.logger.error('External composition failure: invalid shape of data: %o', parseResult.error);

    throw new Error(`External composition failure: invalid shape of data`);
  }

  if (parseResult.data.type === 'success') {
    args.logger.debug('External composition successful, checking compatibility');

    await checkExternalCompositionCompatibility(args.logger, parseResult.data.result.sdl);

    return {
      type: 'success',
      result: {
        supergraph: parseResult.data.result.supergraph,
        sdl: print(transformSupergraphToPublicSchema(parse(parseResult.data.result.supergraph))),
      },
      includesNetworkError: false,
    };
  }

  return parseResult.data;
}

async function checkExternalCompositionCompatibility(logger: ServiceLogger, maybeSdl: string) {
  let parsed: DocumentNode | undefined;
  let errors: ReadonlyArray<GraphQLError> | undefined;
  try {
    parsed = parse(maybeSdl);
    errors = validateSDL(parsed);
  } catch (err) {
    if (parsed === undefined) {
      return;
    }
    Sentry.captureException(err);
  } finally {
    if (errors === undefined || errors.length > 0) {
      logger.warn(`External composition GraphQL validity check failed. (info=%o)`, {
        isParseSuccessful: parsed !== undefined,
        validationErrors: errors?.map(e => e.message) ?? null,
      });
    } else {
      logger.debug(`External composition GraphQL validity check passed.`);
    }
  }
}

function errorWithPossibleCode(error: unknown) {
  if (error instanceof GraphQLError && error.extensions?.code) {
    return toValidationError(error, 'composition');
  }

  return toValidationError(error, 'graphql');
}

function hash(secret: string, alg: string, value: string) {
  return createHmac(alg, secret).update(value, 'utf-8').digest('hex');
}

async function callExternalServiceViaBroker(
  broker: {
    endpoint: string;
    signature: string;
  },
  payload: BrokerPayload,
  logger: ServiceLogger,
  timeoutMs: number,
  requestId: string,
) {
  return callExternalService(
    {
      url: broker.endpoint,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-hive-signature': broker.signature,
        'x-request-id': requestId,
      },
      body: JSON.stringify(payload),
    },
    logger,
    timeoutMs,
  );
}

async function callExternalService(
  input: { url: string; headers: Record<string, string>; body: string },
  logger: ServiceLogger,
  timeoutMs: number,
) {
  const tracer = trace.getTracer('external-composition');
  const parsedUrl = new URL(input.url);
  const span = tracer.startSpan('External Composition', {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.client': 'got',
      'client.address': parsedUrl.hostname,
      'client.port': parsedUrl.port,
      'http.method': 'POST',
      'http.route': parsedUrl.pathname,
    },
  });

  try {
    logger.debug('Calling external composition service (url=%s)', input.url);
    const response = await got(input.url, {
      method: 'POST',
      headers: input.headers,
      body: input.body,
      responseType: 'text',
      retry: {
        limit: 5,
        methods: ['POST', ...(got.defaults.options.retry.methods ?? [])],
        statusCodes: [404].concat(got.defaults.options.retry.statusCodes ?? []),
        backoffLimit: 500,
      },
      timeout: {
        request: timeoutMs,
      },
    });

    span.setAttribute('http.response.body.size', response.rawBody.length);
    span.setAttribute('http.response.status_code', response.statusCode);
    span.end();

    return JSON.parse(response.body) as unknown;
  } catch (error) {
    if (error instanceof RequestError) {
      if (!error.response) {
        span.setAttribute('error.message', error.message);
        span.setAttribute('error.type', error.name);

        logger.error(
          'Network error without response. (errorName=%s, errorMessage=%s)',
          error.name,
          error.message,
        );

        return {
          type: 'failure',
          result: {
            sdl: null,
            supergraph: null,
            errors: [
              {
                message: `External composition network failure. Is the service reachable?`,
                source: 'graphql',
              },
            ],
          },
          includesNetworkError: true,
        };
      }

      if (error.response) {
        span.setAttribute('http.response.status_code', error.response.statusCode);
        const message = error.response.body ? error.response.body : error.response.statusMessage;

        // If the response is a string starting with ERR_ it's a special error returned by the composition service.
        // We don't want to throw an error in this case, but instead return a failure result.
        if (typeof message === 'string') {
          const translatedMessage = translateMessage(message);
          span.setAttribute('error.message', translatedMessage || '');
          span.setAttribute('error.type', error.name);

          if (translatedMessage) {
            return {
              type: 'failure',
              result: {
                errors: [
                  {
                    message: `External composition failure: ${translatedMessage}`,
                    source: 'graphql',
                  },
                ],
              },
              includesNetworkError: true,
            };
          }
        }

        logger.error(
          'Network error, will return failure (url=%s, status=%s, message=%s)',
          input.url,
          error.response.statusCode,
          error.message,
        );

        logger.error(error);

        span.setAttribute('error.message', error.message || '');
        span.setAttribute('error.type', error.name);

        return {
          type: 'failure',
          result: {
            errors: [
              {
                message: `External composition network failure: ${error.message}`,
                source: 'graphql',
              },
            ],
          },
          includesNetworkError: true,
        };
      }
    }

    logger.error('encountered an unexpected error, throwing. error=%o', error);

    throw error;
  } finally {
    span.end();
  }
}

const codeToExplanationMap: Record<ErrorCode, string> = {
  ERR_EMPTY_BODY: 'The body of the request is empty',
  ERR_INVALID_SIGNATURE: 'The signature is invalid. Please check your secret',
};

function translateMessage(errorCode: string) {
  const explanation = codeToExplanationMap[errorCode as ErrorCode];

  if (explanation) {
    return `(${errorCode}) ${explanation}`;
  }
}
