import { print, type ExecutionResult } from 'graphql';
import { http } from '@graphql-hive/core';
import { LegacyLogger } from '@graphql-hive/core/typings/client/types';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  APIError,
  HTTPError,
  InvalidRegistryTokenError,
  isAggregateError,
  MissingArgumentsError,
  NetworkError,
} from './errors';

export function graphqlRequest(config: {
  endpoint: string;
  additionalHeaders?: Record<string, string>;
  version?: string;
  logger?: LegacyLogger;
}) {
  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': `hive-cli/${config.version}`,
    ...config.additionalHeaders,
  };

  return {
    request: async <TResult, TVariables>(
      args: {
        operation: TypedDocumentNode<TResult, TVariables>;
        /** timeout in milliseconds */
        timeout?: number;
      } & (TVariables extends Record<string, never>
        ? {
            variables?: never;
          }
        : {
            variables: TVariables;
          }),
    ): Promise<TResult> => {
      let response: Response;
      try {
        response = await http.post(
          config.endpoint,
          JSON.stringify({
            query: typeof args.operation === 'string' ? args.operation : print(args.operation),
            variables: args.variables,
          }),
          {
            logger: config.logger,
            headers: requestHeaders,
            timeout: args.timeout,
          },
        );
      } catch (e: any) {
        const sourceError = e?.cause ?? e;
        if (isAggregateError(sourceError)) {
          throw new NetworkError(sourceError.errors[0]?.message);
        } else {
          throw new NetworkError(sourceError);
        }
      }

      if (!response.ok) {
        throw new HTTPError(
          config.endpoint,
          response.status,
          response.statusText ?? 'Invalid status code for HTTP call',
        );
      }

      let jsonData;
      try {
        jsonData = (await response.json()) as ExecutionResult<TResult>;
      } catch (err) {
        config.logger?.debug?.(String(err));
        const contentType = response?.headers?.get('content-type');
        throw new APIError(
          `Response from graphql was not valid JSON.${contentType ? ` Received "content-type": "${contentType}".` : ''}`,
          cleanRequestId(response?.headers?.get('x-request-id')),
        );
      }

      if (jsonData.errors && jsonData.errors.length > 0) {
        if (jsonData.errors[0].extensions?.code === 'ERR_MISSING_TARGET') {
          throw new MissingArgumentsError([
            'target',
            'The target on which the action is performed.' +
              ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
              ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
          ]);
        }
        if (jsonData.errors[0].message === 'Invalid token provided') {
          throw new InvalidRegistryTokenError();
        }

        config.logger?.debug?.(jsonData.errors.map(String).join('\n'));
        throw new APIError(
          jsonData.errors.map(e => e.message).join('\n'),
          cleanRequestId(response?.headers?.get('x-request-id')),
        );
      }

      return jsonData.data!;
    },
  };
}

export function cleanRequestId(requestId?: string | null) {
  return requestId ? requestId.split(',')[0].trim() : undefined;
}
