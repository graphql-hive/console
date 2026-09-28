// @vitest-environment jsdom
import { parse } from 'graphql';
import { filter, fromPromise, mergeMap, pipe } from 'wonka';
import { act, renderHook } from '@testing-library/react';
import { createClient, makeResult, type Exchange } from '@urql/core';
import { networkStatusExchange, useInflightRequests } from './state';

// Holds every answer until the test releases it, so "in flight" does not depend on timers; a
// delay-based answer raced the assertions on a loaded CI runner.
function heldClient() {
  let release = () => {};
  const held: Exchange = () => operations$ =>
    pipe(
      operations$,
      filter(operation => operation.kind !== 'teardown'),
      mergeMap(operation =>
        fromPromise(
          new Promise<void>(resolve => (release = resolve)).then(() =>
            makeResult(operation, { data: { __typename: 'Query' } }),
          ),
        ),
      ),
    );
  const client = createClient({
    url: 'http://test.invalid/graphql',
    exchanges: [networkStatusExchange, held],
  });
  return { client, release: () => release() };
}

const probe = parse('query Probe { __typename }');

// The store notifies asynchronously, so each step runs inside `act` for the hook to see it.
describe('networkStatusExchange', () => {
  it('counts a query while it is in flight and settles once it is answered', async () => {
    const { client, release } = heldClient();
    const { result } = renderHook(() => useInflightRequests());
    let done: Promise<unknown> | undefined;

    await act(async () => {
      done = client.query(probe, {}).toPromise();
    });
    expect(result.current).toBe(1);

    await act(async () => {
      release();
      await done;
    });
    expect(result.current).toBe(0);
  });

  it('ignores a preload', async () => {
    const { client, release } = heldClient();
    const { result } = renderHook(() => useInflightRequests());
    let done: Promise<unknown> | undefined;

    await act(async () => {
      done = client.query(probe, {}, { preload: true }).toPromise();
    });
    expect(result.current).toBe(0);

    await act(async () => {
      release();
      await done;
    });
    expect(result.current).toBe(0);
  });
});
