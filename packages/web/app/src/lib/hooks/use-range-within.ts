import { useState } from 'react';
import { startsWithin } from './use-date-range-controller';

type Range = { from: string; to: string };

// A picked range, read through the boundary on every render: a retention change mid-session
// moves a range it no longer covers, and gives it back if the retention grows again.
export function useRangeWithin(initial: Range, boundary: Date, fallback: Range) {
  const [selected, setSelected] = useState(initial);
  const range = startsWithin(selected, boundary) ? selected : fallback;
  return [range, setSelected] as const;
}
