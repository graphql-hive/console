import { ExecutionResult, parse, print } from 'graphql';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { sortSDL } from '@theguild/federation-composition';
import { getServiceHost } from './utils';

/**
 * Sorts the SDL of a supergraph schema and removes any extra whitespace.
 * Helps with schema assertions, especially the snapshot tests.
 * @param sdl The SDL of a supergraph schema.
 * @returns The normalized SDL.
 */
export function normalizeSupergraph(sdl: string): string {
  return print(sortSDL(parse(sdl, { noLocation: true })));
}

export async function execute<TResult, TVariables>(
  params: {
    document: TypedDocumentNode<TResult, TVariables>;
    operationName?: string;
    authToken?: string;
    token?: string;
    legacyAuthorizationMode?: boolean;
  } & (TVariables extends Record<string, never>
    ? { variables?: never }
    : { variables: TVariables }),
) {
  const registryAddress = await getServiceHost('server', 8082);
  const endpoint = `http://${registryAddress}/graphql`;
  const queryString = print(params.document);
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: queryString,
      operationName: params.operationName,
      variables: params.variables,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(params.authToken
        ? {
            authorization: `Bearer ${params.authToken}`,
          }
        : {}),
      ...(params.token
        ? params.legacyAuthorizationMode
          ? {
              'x-api-token': params.token,
            }
          : {
              authorization: `Bearer ${params.token}`,
            }
        : {}),
    },
  });

  const body = (await response.json()) as ExecutionResult<TResult>;

  const detailsDump = `\n\tendpoint: ${endpoint}\n\tquery:\n${queryString}\n\tbody:\n${JSON.stringify(
    body,
    null,
    2,
  )}\n\trequest-id: ${response.headers.get('x-request-id')}\n`;

  return {
    rawBody: body,
    status: response.status,
    expectGraphQLErrors() {
      if (!body?.errors?.length) {
        throw new Error(
          `Expected GraphQL response to have errors, but no errors were found!${detailsDump}`,
        );
      }

      return body.errors!;
    },
    expectNoGraphQLErrors: async () => {
      if (body?.errors?.length) {
        throw new Error(
          `Expected GraphQL response to have no errors, but got ${
            body.errors.length
          } errors:\n\t${body.errors.map(e => e.message).join('\n')}${detailsDump}`,
        );
      }

      return body.data!;
    },
  };
}
