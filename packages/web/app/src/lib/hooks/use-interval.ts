import { useEffect, useRef } from 'react';

// Never fires on mount: a poll on top of a route loader, which already ran once.
export function useInterval(ms: number, fn: () => void) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    const id = setInterval(() => latest.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
