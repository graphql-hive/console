import { Callout } from '@/components/ui/callout';
import { TimeAgo } from '@/components/ui/time-ago';
import { DeliveryHealthStatus } from '@/gql/graphql';

/** A channel failing for this long gets the warning. */
export const CHANNEL_FAILING_WARNING_AFTER_MS = 60 * 60 * 1000;
export const CHANNEL_DISABLE_GRACE_HOURS = 48;

/** The only place the auto-disable copy lives; the behaviour it announces ships separately. */
export function channelDisableNotice(): string {
  return `It will be disabled once it has been failing for ${CHANNEL_DISABLE_GRACE_HOURS} hours.`;
}

export type ChannelHealth = {
  status: DeliveryHealthStatus;
  failingSince?: string | null;
  lastStatusCode?: number | null;
  lastStatusText?: string | null;
};

export function ChannelHealthWarning({ health, now }: { health: ChannelHealth | null; now: Date }) {
  if (!health || health.status !== DeliveryHealthStatus.Failing || !health.failingSince) {
    return null;
  }
  if (now.getTime() - new Date(health.failingSince).getTime() < CHANNEL_FAILING_WARNING_AFTER_MS) {
    return null;
  }

  const lastResponse = [health.lastStatusCode, health.lastStatusText].filter(Boolean).join(' ');

  return (
    <Callout type="warning" className="mt-0">
      <p className="font-medium">
        This channel has been failing since <TimeAgo date={health.failingSince} />.
      </p>
      <p>{channelDisableNotice()}</p>
      {lastResponse ? <p className="font-mono text-xs">Last response: {lastResponse}</p> : null}
    </Callout>
  );
}
