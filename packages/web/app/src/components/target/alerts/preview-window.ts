const DAY_IN_MINUTES = 24 * 60;
const MAX_PREVIEW_MINUTES = 14 * DAY_IN_MINUTES;

// Twice the rule's window, so the chart shows the window before it too, within what the plan keeps.
export function previewWindowMinutes(timeWindowMinutes: string, retentionInDays?: number): number {
  const window = (parseInt(timeWindowMinutes, 10) || 10_080) * 2;
  const cap = Math.min(MAX_PREVIEW_MINUTES, (retentionInDays ?? 14) * DAY_IN_MINUTES);
  return Math.min(window, cap);
}
