import { presetLast7Days } from '@/components/ui/date-range-picker';
import { Period } from '@/lib/date-math';

const KEY = 'hive:schema-explorer:period-1';

// The URL is the period; storage only remembers the last preset picked, for the next bare URL.
export function rememberedExplorerPeriod(): Period {
  const stored = localStorage.getItem(KEY);
  if (stored) {
    try {
      const parsed = Period.safeParse(JSON.parse(stored));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // Unreadable storage takes the default below.
    }
  }
  return presetLast7Days.range;
}

export function rememberExplorerPeriod(range: Period) {
  localStorage.setItem(KEY, JSON.stringify(range));
}
