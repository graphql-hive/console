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
