import { useEffect, useState } from 'react';

/**
 * Returns an integer that increments every `intervalMs`. Include it in a
 * `useMemo`/`useEffect` dep array on pages that derive variables from `now()`
 * — bumping the counter forces those variables to recompute with a fresh
 * "now", which causes any dependent `useQuery` to refetch with up-to-date
 * arguments.
 *
 * urql v4 has no `pollInterval`; calling `reexecuteQuery` with the same
 * variables just re-asks the same question. This is the canonical fix for
 * "real-time" dashboards backed by a frozen time-window query.
 */
export function useTickCounter(intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
