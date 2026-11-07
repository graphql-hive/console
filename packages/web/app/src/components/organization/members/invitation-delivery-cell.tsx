import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { formatTimeAgo } from '@/components/ui/time-ago';

/** The most recent attempt to email an invitation, as the members page selects it. */
export type InvitationDelivery = {
  timestamp: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  attempt: number;
  maxAttempts: number;
};

export const INVITATION_DELIVERY_COLUMN_TOOLTIP =
  'Whether the mail provider accepted the invitation email. Accepted email can still land in a spam folder.';

export type InvitationDeliveryState = {
  label: string;
  dot: 'neutral' | 'success' | 'critical';
  tooltip: string;
};

/** What the cell says about an invitation's email; `now` dates the acceptance. */
export function describeInvitationDelivery(
  delivery: InvitationDelivery | null,
  now: number,
): InvitationDeliveryState {
  if (!delivery) {
    return {
      label: 'Not sent yet',
      dot: 'neutral',
      tooltip: 'No delivery attempt has been recorded yet.',
    };
  }

  if (delivery.ok) {
    return {
      label: 'Sent',
      dot: 'success',
      tooltip: `Accepted by the mail provider ${formatTimeAgo(new Date(delivery.timestamp), now)}. Accepted email can still land in a spam folder; ask the invitee to check there if it has not arrived.`,
    };
  }

  const answer = (
    delivery.statusCode ? `${delivery.statusCode} ${delivery.statusText}` : delivery.statusText
  ).replace(/\.$/, '');
  const retry =
    delivery.attempt < delivery.maxAttempts ? 'Hive will try again.' : 'Hive has stopped retrying.';

  return {
    label: `Failed (attempt ${delivery.attempt} of ${delivery.maxAttempts})`,
    dot: 'critical',
    tooltip: `${answer}. ${retry}`,
  };
}

export function InvitationDeliveryStatus({ delivery }: { delivery: InvitationDelivery | null }) {
  const { label, dot, tooltip } = describeInvitationDelivery(delivery, Date.now());
  return <DataTableCell kind="status" label={label} dot={dot} tooltip={tooltip} />;
}
