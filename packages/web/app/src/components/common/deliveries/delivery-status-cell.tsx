import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';

/** The status as the table shows it: the code the destination answered, then its text. */
export function statusLabel(delivery: { statusCode: number | null; statusText: string }): string {
  return delivery.statusCode
    ? `${delivery.statusCode} ${delivery.statusText}`
    : delivery.statusText;
}

// Reason phrases and Slack result codes fit the column; a transport error such as
// "ETIMEDOUT: Timeout awaiting 'request' for 10000ms" or a mail provider's refusal runs past it.
const LONG_STATUS_LENGTH = 32;

/** The full status for a popover when the column is likely to truncate it. */
export function statusPopover(label: string): string | undefined {
  return label.length > LONG_STATUS_LENGTH ? label : undefined;
}

/** The status cell's look, filling the column so a long status truncates instead of widening it. */
export function DeliveryStatusCell({ ok, label }: { ok: boolean; label: string }) {
  const body = (
    <span className="flex items-center gap-1.5 text-fg">
      <StatusDot color={ok ? 'success' : 'critical'} />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
  const popover = statusPopover(label);
  return popover ? <Tooltip trigger={body} content={popover} /> : body;
}
