// @vitest-environment jsdom
import { parse } from 'graphql';
import { delay, filter, map, pipe } from 'wonka';
import { act, renderHook } from '@testing-library/react';
import { createClient, makeResult, type Exchange } from '@urql/core';
import { networkStatusExchange, useInflightRequests } from './state';

// Answers every operation a beat later, so "in flight" is observable.
const slow: Exchange = () => operations$ =>
  pipe(
    operations$,
    filter(operation => operation.kind !== 'teardown'),
    delay(20),
    map(operation => makeResult(operation, { data: { __typename: 'Query' } })),
  );

const client = createClient({
  url: 'http://test.invalid/graphql',
  exchanges: [networkStatusExchange, slow],
});
const probe = parse('query Probe { __typename }');
const tick = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// The store batches its notifications, so the timeline runs inside `act` for the hook to see it.
describe('networkStatusExchange', () => {
  it('counts a query while it is in flight and settles once it is answered', async () => {
    const { result } = renderHook(() => useInflightRequests());
    let done: Promise<unknown> | undefined;

    await act(async () => {
      done = client.query(probe, {}).toPromise();
      await tick(5);
    });
    expect(result.current).toBe(1);

    await act(async () => {
      await done;
      await tick(150);
    });
    expect(result.current).toBe(0);
  });

  it('ignores a preload', async () => {
    const { result } = renderHook(() => useInflightRequests());
    let done: Promise<unknown> | undefined;

    await act(async () => {
      done = client.query(probe, {}, { preload: true }).toPromise();
      await tick(5);
    });
    expect(result.current).toBe(0);

    await act(async () => {
      await done;
    });
    expect(result.current).toBe(0);
  });
});
