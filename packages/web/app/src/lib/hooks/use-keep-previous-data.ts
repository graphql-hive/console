import { useRef } from 'react';

/**
 * Holds the last settled `result.data` so a polling query updates in place
 * instead of flashing empty while the next request is in flight.
 */
export function useKeepPreviousData<T>(value: T | undefined, pending: boolean): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (!pending && value !== undefined) {
    ref.current = value;
  }
  return ref.current;
}
