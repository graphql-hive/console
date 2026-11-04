import { useMemo } from 'react';
import { subHours } from 'date-fns';
import { resolveRangeAndResolution } from '@/lib/hooks/use-date-range-controller';
import { useRollingNow } from '@/lib/hooks/use-rolling-now';

/** Every deliveries page shows the most recent three days. */
export const DELIVERY_WINDOW_HOURS = 72;
export const DELIVERY_WINDOW_LABEL = `the last ${DELIVERY_WINDOW_HOURS} hours`;

/** The window's period and resolution, moved forward on every poll tick. */
export function useDeliveryWindow(pollIntervalMs: number) {
  const now = useRollingNow(pollIntervalMs);
  const window = useMemo(() => {
    const resolved = resolveRangeAndResolution({
      from: subHours(now, DELIVERY_WINDOW_HOURS),
      to: now,
    });
    return {
      from: resolved.range.from.toISOString(),
      to: resolved.range.to.toISOString(),
      resolution: resolved.resolution,
    };
  }, [now]);
  return { now, ...window };
}
