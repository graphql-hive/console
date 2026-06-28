import type { Story, StoryDefault } from '@ladle/react';
import {
  DegradedChannelsBanner,
  DegradedChannelsIndicator,
  type DegradedChannelEntry,
} from './degraded-channels';

export default {
  title: 'Target / Alerts / Degraded channels',
} satisfies StoryDefault;

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

const oneChannel: DegradedChannelEntry[] = [
  {
    channel: { id: '1', name: 'eng-alerts', type: 'SLACK' },
    degradedAt: hoursAgo(2),
    lastError: 'HTTP 503 Service Unavailable',
  },
];

const multipleChannels: DegradedChannelEntry[] = [
  {
    channel: { id: '1', name: 'eng-alerts', type: 'SLACK' },
    degradedAt: hoursAgo(2),
    lastError: 'HTTP 503 Service Unavailable',
  },
  {
    channel: { id: '2', name: 'ops-webhook', type: 'WEBHOOK' },
    degradedAt: hoursAgo(5),
    lastError: 'connect ETIMEDOUT 10.0.0.5:443',
  },
  {
    channel: { id: '3', name: 'teams-incidents', type: 'MSTEAMS_WEBHOOK' },
    degradedAt: hoursAgo(20),
    lastError: null,
  },
];

export const BannerSingle: Story = () => <DegradedChannelsBanner channels={oneChannel} />;

export const BannerMultiple: Story = () => <DegradedChannelsBanner channels={multipleChannels} />;

export const BannerEmpty: Story = () => (
  <div className="text-neutral-10 text-sm">
    Renders nothing when there are no degraded channels:
    <DegradedChannelsBanner channels={[]} />
  </div>
);

export const Indicator: Story = () => (
  <div className="flex items-center gap-2 text-sm">
    <span>Destination: Slack</span>
    <DegradedChannelsIndicator channels={oneChannel} />
    <span className="text-neutral-10">(hover the icon)</span>
  </div>
);

export const IndicatorMultiple: Story = () => (
  <div className="flex items-center gap-2 text-sm">
    <span>Destination: Slack, Webhook, MS Teams</span>
    <DegradedChannelsIndicator channels={multipleChannels} />
    <span className="text-neutral-10">(hover the icon)</span>
  </div>
);
