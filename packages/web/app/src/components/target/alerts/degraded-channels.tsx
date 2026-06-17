import { formatDistanceToNow } from 'date-fns';
import { TriangleAlert } from 'lucide-react';
import { Callout } from '@/components/ui/callout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type DegradedChannelEntry = {
  channel: { id: string; name: string; type: string };
  degradedAt: string;
  lastError?: string | null;
};

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  SLACK: 'Slack',
  WEBHOOK: 'Webhook',
  MSTEAMS_WEBHOOK: 'MS Teams',
};

function channelTypeLabel(type: string): string {
  return CHANNEL_TYPE_LABEL[type] ?? type;
}

export function DegradedChannelsBanner({
  channels,
}: {
  channels: ReadonlyArray<DegradedChannelEntry>;
}) {
  if (channels.length === 0) {
    return null;
  }
  const names = channels.map(c => c.channel.name).join(', ');
  return (
    <Callout type="warning">
      <span className="font-semibold">Notification delivery degraded.</span> We couldn't deliver a
      recent alert to {names} after multiple attempts. New alerts will still be attempted — check the
      channel configuration.
    </Callout>
  );
}

export function DegradedChannelsIndicator({
  channels,
}: {
  channels: ReadonlyArray<DegradedChannelEntry>;
}) {
  if (channels.length === 0) {
    return null;
  }
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-warning inline-flex cursor-help">
            <TriangleAlert className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            {channels.map(c => (
              <div key={c.channel.id}>
                <span className="font-medium">
                  {channelTypeLabel(c.channel.type)} · {c.channel.name}
                </span>{' '}
                — last delivery failed{' '}
                {formatDistanceToNow(new Date(c.degradedAt), { addSuffix: true })}
                {c.lastError ? (
                  <div className="text-neutral-10 font-mono">{c.lastError}</div>
                ) : null}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
