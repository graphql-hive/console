import { useEffect, useRef } from 'react';
import type { OperationContext } from 'urql';

/**
 * Re-fetches a query from the network each time `tick` moves. Two ticks are skipped: the one the
 * component mounted with, which the query already ran for, and one on which `refetch` itself
 * changed, because urql hands out a new `reexecuteQuery` when the variables change and is already
 * fetching for them.
 */
export function useRefetchOnTick(
  tick: Date,
  refetch: (context?: Partial<OperationContext>) => void,
) {
  const last = useRef({ tick: tick.getTime(), refetch });
  useEffect(() => {
    const tickMoved = last.current.tick !== tick.getTime();
    const queryChanged = last.current.refetch !== refetch;
    last.current = { tick: tick.getTime(), refetch };
    if (tickMoved && !queryChanged) {
      refetch({ requestPolicy: 'network-only' });
    }
  }, [tick, refetch]);
}
