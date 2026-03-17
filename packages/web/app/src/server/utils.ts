import { ExecutionResult, print, stripIgnoredCharacters } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

export async function graphqlRequest<TResult, TVariables>({
  url,
  headers,
  operationName,
  document,
  variables,
  credentials,
}: {
  url: string;
  headers: Record<string, any>;
  operationName: string;
  document: TypedDocumentNode<TResult, TVariables>;
  credentials?: 'omit' | 'include' | 'same-origin';
} & (TVariables extends Record<string, never>
  ? { variables?: never }
  : { variables: TVariables })): Promise<ExecutionResult<TResult>> {
  const response = await fetch(url, {
    headers,
    method: 'POST',
    credentials,
    body: JSON.stringify({
      operationName,
      query: stripIgnoredCharacters(print(document)),
      variables,
    }),
  } as any);

  return response.json();
}
