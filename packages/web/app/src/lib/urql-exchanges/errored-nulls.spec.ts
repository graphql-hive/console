import { parse } from 'graphql';
import { filter, fromValue, mergeMap, pipe } from 'wonka';
import { CombinedError, createClient, makeResult, type Exchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { erroredNullsExchange, withoutErroredNulls } from './errored-nulls';

const operation = { kind: 'query', key: 1, variables: {}, context: {} } as never;

function erroredResult(data: unknown, errors: { message: string; path?: (string | number)[] }[]) {
  return {
    operation,
    data,
    error: new CombinedError({ graphQLErrors: errors }),
    stale: false,
    hasNext: false,
  };
}

describe('withoutErroredNulls', () => {
  it('removes the null an error bubbled up to, keeping its siblings', () => {
    const result = erroredResult({ __typename: 'Query', target: null, other: 1 }, [
      { message: 'boom', path: ['target', 'operationsStats'] },
    ]);
    expect(withoutErroredNulls(result).data).toEqual({ __typename: 'Query', other: 1 });
  });

  it('removes a null inside a list item without touching the rest of the list', () => {
    const result = erroredResult({ edges: [{ node: { id: 'a' } }, { node: null }] }, [
      { message: 'boom', path: ['edges', 1, 'node', 'name'] },
    ]);
    expect(withoutErroredNulls(result).data).toEqual({
      edges: [{ node: { id: 'a' } }, {}],
    });
  });

  it('returns the result as is when the error path holds no null, or has no path', () => {
    const data = { target: { id: 't' } };
    const kept = erroredResult(data, [{ message: 'boom', path: ['target', 'id'] }]);
    expect(withoutErroredNulls(kept).data).toBe(data);
    const pathless = erroredResult(data, [{ message: 'boom' }]);
    expect(withoutErroredNulls(pathless).data).toBe(data);
    const clean = { operation, data, stale: false, hasNext: false };
    expect(withoutErroredNulls(clean)).toBe(clean);
  });
});

describe('erroredNullsExchange', () => {
  const document = parse('query Stats { target { id operationsStats { totalRequests } } }');

  // The server answers once, then the exchange's effect shows in what the cache hands back.
  function clientAnsweringOnce(answer: unknown, exchanges: Exchange[]) {
    let calls = 0;
    const network: Exchange = () => operations$ =>
      pipe(
        operations$,
        filter(op => op.kind !== 'teardown'),
        mergeMap(op => {
          calls++;
          return fromValue(makeResult(op, answer as never));
        }),
      );
    const client = createClient({
      url: 'http://test.invalid/graphql',
      exchanges: [cacheExchange({}), ...exchanges, network],
    });
    return { client, calls: () => calls };
  }

  const answer = {
    data: { __typename: 'Query', target: null },
    errors: [{ message: 'Unknown subgraph: gone.', path: ['target', 'operationsStats'] }],
  };

  it('keeps an errored null out of the cache, so the next read fetches the error again', async () => {
    const { client, calls } = clientAnsweringOnce(answer, [erroredNullsExchange]);
    await client.query(document, {}).toPromise();
    const second = await client.query(document, {}).toPromise();
    expect(calls()).toBe(2);
    expect(second.error?.graphQLErrors[0]?.message).toBe('Unknown subgraph: gone.');
  });

  it('without it, the cache answers the next read with the null and no error', async () => {
    const { client, calls } = clientAnsweringOnce(answer, []);
    await client.query(document, {}).toPromise();
    const second = await client.query(document, {}).toPromise();
    expect(calls()).toBe(1);
    expect(second.data).toEqual({ target: null });
    expect(second.error).toBeUndefined();
  });
});
