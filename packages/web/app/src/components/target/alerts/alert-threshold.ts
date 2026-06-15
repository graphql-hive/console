/**
 * Shared threshold helpers for metric-alert rules, used by the create/edit
 * form, the notification preview, and the conditions panel so the unit and
 * sign conventions can't drift between them.
 */

/**
 * The display unit for a rule's threshold value. A PERCENTAGE_CHANGE threshold
 * is always a percent regardless of the underlying metric; a FIXED_VALUE
 * carries the metric's own unit (ms for latency, % for error rate, requests
 * for traffic). Mirrors the per-type units in the evaluator / notifier.
 *
 * Accepts the raw enum string ('LATENCY' | 'ERROR_RATE' | 'TRAFFIC',
 * 'FIXED_VALUE' | 'PERCENTAGE_CHANGE') so callers can pass either the GraphQL
 * enum value or the form's Select value without converting.
 */
export function thresholdUnit(metricType: string, thresholdType: string): 'ms' | '%' | 'requests' {
  if (thresholdType === 'PERCENTAGE_CHANGE') {
    return '%';
  }
  switch (metricType) {
    case 'LATENCY':
      return 'ms';
    case 'ERROR_RATE':
      return '%';
    default:
      return 'requests'; // TRAFFIC
  }
}

/**
 * The form presents % change as a non-negative magnitude plus an
 * Increase/Decrease direction. The evaluator, however, compares a *signed*
 * percentage...a 50% drop is -50 (see `isThresholdBreached` in
 * packages/services/workflows/src/lib/metric-alert-evaluator.ts). Convert a UI
 * magnitude to the signed value the backend stores: only PERCENTAGE_CHANGE +
 * BELOW (a "decrease") is negated. FIXED_VALUE values are always non-negative
 * and pass through unchanged.
 */
export function applyThresholdSign(
  magnitude: number,
  thresholdType: string,
  direction: string,
): number {
  return thresholdType === 'PERCENTAGE_CHANGE' && direction === 'BELOW' ? -magnitude : magnitude;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

type OverTime = ReadonlyArray<{ date: string; value: number }>;
type DurationOverTime = ReadonlyArray<{
  date: string;
  duration: { avg: number; p75: number; p90: number; p95: number; p99: number };
}>;

/**
 * Reduces each window to the single aggregate the evaluator compares...summed
 * requests for TRAFFIC, ratio-of-sums for ERROR_RATE. LATENCY percentiles can't
 * be re-merged from per-bucket percentiles without the t-digest states, so this
 * approximates with the mean of the window's bucket percentiles (the chart
 * flags it as approximate).
 *
 * A bucket belongs to the current window when its timestamp is at/after
 * `boundaryMs`, mirroring the evaluator's window split.
 */
export function windowAggregates(
  metricType: string,
  latencyKey: 'avg' | 'p75' | 'p90' | 'p95' | 'p99' | null,
  requests: OverTime,
  failures: OverTime,
  durations: DurationOverTime,
  boundaryMs: number,
): { current: number; previous: number } {
  const reduce = (isCurrent: boolean): number => {
    if (metricType === 'LATENCY' && latencyKey) {
      return mean(
        durations
          .filter(n => new Date(n.date).getTime() >= boundaryMs === isCurrent)
          .map(n => n.duration[latencyKey]),
      );
    }
    let req = 0;
    let fail = 0;
    for (const [i, n] of requests.entries()) {
      if ((new Date(n.date).getTime() >= boundaryMs) === isCurrent) {
        req += n.value;
        fail += failures[i]?.value ?? 0;
      }
    }
    if (metricType === 'ERROR_RATE') {
      return req > 0 ? (fail / req) * 100 : 0;
    }
    return req; // TRAFFIC
  };
  return { current: reduce(true), previous: reduce(false) };
}
