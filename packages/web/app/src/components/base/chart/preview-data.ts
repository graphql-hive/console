/**
 * Fixed mock series for the chart previews, shaped like what the Insights queries return: a week
 * of hourly buckets. Deterministic, so a preview looks the same on every load.
 *
 * Not named `*.preview.tsx`, so foundry does not mount it as a preview of its own.
 */

const HOUR = 60 * 60 * 1000;
const END = Date.UTC(2026, 8, 29, 12);

/** A daily rhythm with bursts, peaking near `peak`. `seed` shifts the pattern between series. */
export function week(peak: number, seed = 0): [string, number][] {
  return Array.from({ length: 7 * 24 }, (_, i) => {
    const time = END - (7 * 24 - 1 - i) * HOUR;
    const daily = (Math.sin(((i + seed) / 24) * Math.PI * 2) + 1) / 2;
    const burst = Math.max(0, Math.sin(i * 1.7 + seed) * Math.sin(i * 0.31)) ** 4;
    return [new Date(time).toISOString(), Math.round(peak * (0.3 + 0.35 * daily + 0.35 * burst))];
  });
}

/** The same buckets with every value mapped, for series derived from another (RPM, percentiles). */
export function mapValues(series: [string, number][], fn: (value: number, index: number) => number) {
  return series.map(([date, value], i): [string, number] => [date, fn(value, i)]);
}
