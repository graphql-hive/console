import { useEffect, useMemo, useState } from 'react';

/**
 * A clock that ticks in `intervalMs` steps: the current time, floored to
 * `intervalMs`. Stays identical between ticks, so it only moves a rolling
 * time-window query forward when the window actually steps.
 */
export function useRollingNow(intervalMs: number): Date {
  const [nowMs, setNowMs] = useState(() => Math.floor(Date.now() / intervalMs) * intervalMs);
  useEffect(() => {
    const id = setInterval(
      () => {
        const next = Math.floor(Date.now() / intervalMs) * intervalMs;
        setNowMs(prev => (prev === next ? prev : next));
      },
      Math.min(1000, intervalMs),
    );
    return () => clearInterval(id);
  }, [intervalMs]);
  return useMemo(() => new Date(nowMs), [nowMs]);
}
