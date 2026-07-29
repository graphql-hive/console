import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '@graphql-hive/logger';
import type { PostgresDatabasePool } from '@hive/postgres';
import type { AlertChannelRow, NotificationEvent } from './metric-alert-notifier.js';

const postMessage = vi.fn(async (_args: { attachments: Array<{ color: string }> }) => ({
  ok: true,
}));

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage };
  },
}));

const { sendSlackNotification } = await import('./metric-alert-notifier.js');

const logger = {
  warn: () => {},
  info: () => {},
  error: () => {},
  debug: () => {},
  child: () => logger,
} as unknown as Logger;

const pg = {
  maybeOneFirst: async () => 'xoxb-test-token',
} as unknown as PostgresDatabasePool;

const channel: AlertChannelRow = {
  id: 'channel-1',
  type: 'SLACK',
  name: 'Alerts',
  slackChannel: '#alerts',
  webhookEndpoint: null,
};

function makeEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    state: 'firing',
    rule: {
      organizationId: 'org-1',
      name: 'Console - Error Rate > 2% over 15min',
      type: 'ERROR_RATE',
      metric: null,
      severity: 'WARNING',
      thresholdType: 'FIXED_VALUE',
      thresholdValue: 2,
      direction: 'ABOVE',
    },
    currentValue: 2.15,
    previousValue: null,
    organizationSlug: 'the-guild',
    projectSlug: 'graphql-hive',
    targetSlug: 'production',
    ...overrides,
  };
}

async function colorFor(event: NotificationEvent): Promise<unknown> {
  postMessage.mockClear();
  await sendSlackNotification({ channel, event, pg, logger });
  return postMessage.mock.calls[0][0].attachments[0].color;
}

describe('sendSlackNotification', () => {
  it('uses the severity hex for the firing state', async () => {
    await expect(colorFor(makeEvent())).resolves.toBe('#c5870d');
  });

  // Slack renders `good`/`warning`/`danger` as a grey bar, so resolved must be a hex.
  it('uses a green hex for the resolved state', async () => {
    await expect(colorFor(makeEvent({ state: 'resolved', currentValue: 1.64 }))).resolves.toBe(
      '#2ECC71',
    );
  });
});
