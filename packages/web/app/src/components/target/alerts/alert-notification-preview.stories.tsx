import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { AlertPreview } from './alert-notification-preview';

export default {
  title: 'Alerts / Notification Preview',
} satisfies StoryDefault;

const baseProps = {
  alertName: 'P99 Latency Above 2000ms',
  metricLabel: 'p99 latency',
  alertType: 'LATENCY',
  severity: 'CRITICAL',
  direction: 'ABOVE',
  thresholdType: 'FIXED_VALUE',
  thresholdValue: '2000',
  targetSlug: 'production',
  projectSlug: 'my-api',
};

export const Slack: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview {...baseProps} channelType="SLACK" />
  </div>
);

export const SlackWarning: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview
      {...baseProps}
      alertName="Error Rate Above 5%"
      metricLabel="Error rate"
      alertType="ERROR_RATE"
      severity="WARNING"
      thresholdType="FIXED_VALUE"
      thresholdValue="5"
      channelType="SLACK"
    />
  </div>
);

export const SlackPercentageChange: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview
      {...baseProps}
      alertName="Traffic Increased by 150%"
      metricLabel="Total requests"
      alertType="TRAFFIC"
      severity="INFO"
      thresholdType="PERCENTAGE_CHANGE"
      thresholdValue="150"
      channelType="SLACK"
    />
  </div>
);

export const Webhook: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview {...baseProps} channelType="WEBHOOK" />
  </div>
);

export const WebhookBelow: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview
      {...baseProps}
      alertName="Request Rate Below 100 rpm"
      metricLabel="Total requests"
      alertType="TRAFFIC"
      severity="CRITICAL"
      direction="BELOW"
      thresholdType="FIXED_VALUE"
      thresholdValue="100"
      channelType="WEBHOOK"
    />
  </div>
);

export const Teams: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview {...baseProps} channelType="MSTEAMS_WEBHOOK" />
  </div>
);

export const TeamsInfo: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview
      {...baseProps}
      alertName="Traffic Increased by 200%"
      metricLabel="Total requests"
      alertType="TRAFFIC"
      severity="INFO"
      thresholdType="PERCENTAGE_CHANGE"
      thresholdValue="200"
      channelType="MSTEAMS_WEBHOOK"
    />
  </div>
);

export const NoChannelSelected: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview {...baseProps} channelType={null} />
  </div>
);

export const EmptyForm: Story = () => (
  <div className="max-w-sm p-8">
    <AlertPreview
      alertName=""
      metricLabel="Total requests"
      alertType="TRAFFIC"
      severity="WARNING"
      direction="ABOVE"
      thresholdType="FIXED_VALUE"
      thresholdValue=""
      channelType="SLACK"
      targetSlug="production"
      projectSlug="my-api"
    />
  </div>
);

export const SideBySide: Story = () => (
  <div className="flex gap-8 p-8">
    <div className="w-80">
      <AlertPreview {...baseProps} channelType="SLACK" />
    </div>
    <div className="w-80">
      <AlertPreview {...baseProps} channelType="WEBHOOK" />
    </div>
    <div className="w-80">
      <AlertPreview {...baseProps} channelType="MSTEAMS_WEBHOOK" />
    </div>
  </div>
);

export const Interactive: Story = () => {
  const [name, setName] = useState('My Alert');
  const [severity, setSeverity] = useState('WARNING');
  const [channel, setChannel] = useState<'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK'>('SLACK');
  const [thresholdValue, setThresholdValue] = useState('200');
  const [thresholdType, setThresholdType] = useState('FIXED_VALUE');

  return (
    <div className="flex gap-8 p-8">
      <div className="w-64 space-y-4">
        <div>
          <label className="text-neutral-11 mb-1 block text-xs font-medium uppercase">Name</label>
          <input
            className="bg-neutral-3 border-neutral-5 text-neutral-12 w-full rounded-sm border px-2 py-1 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-neutral-11 mb-1 block text-xs font-medium uppercase">
            Severity
          </label>
          <select
            className="bg-neutral-3 border-neutral-5 text-neutral-12 rounded-sm border px-2 py-1 text-sm"
            value={severity}
            onChange={e => setSeverity(e.target.value)}
          >
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-neutral-11 mb-1 block text-xs font-medium uppercase">
            Channel
          </label>
          <select
            className="bg-neutral-3 border-neutral-5 text-neutral-12 rounded-sm border px-2 py-1 text-sm"
            value={channel}
            onChange={e => setChannel(e.target.value as typeof channel)}
          >
            <option value="SLACK">Slack</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="MSTEAMS_WEBHOOK">Teams</option>
          </select>
        </div>
        <div>
          <label className="text-neutral-11 mb-1 block text-xs font-medium uppercase">
            Threshold
          </label>
          <input
            className="bg-neutral-3 border-neutral-5 text-neutral-12 w-full rounded-sm border px-2 py-1 text-sm"
            type="number"
            value={thresholdValue}
            onChange={e => setThresholdValue(e.target.value)}
          />
        </div>
        <div>
          <label className="text-neutral-11 mb-1 block text-xs font-medium uppercase">Type</label>
          <select
            className="bg-neutral-3 border-neutral-5 text-neutral-12 rounded-sm border px-2 py-1 text-sm"
            value={thresholdType}
            onChange={e => setThresholdType(e.target.value)}
          >
            <option value="FIXED_VALUE">Fixed value</option>
            <option value="PERCENTAGE_CHANGE">% change vs. previous</option>
          </select>
        </div>
      </div>
      <div className="w-80">
        <AlertPreview
          alertName={name}
          metricLabel="p99 latency"
          alertType="LATENCY"
          severity={severity}
          direction="ABOVE"
          thresholdType={thresholdType}
          thresholdValue={thresholdValue}
          channelType={channel}
          targetSlug="production"
          projectSlug="my-api"
        />
      </div>
    </div>
  );
};
