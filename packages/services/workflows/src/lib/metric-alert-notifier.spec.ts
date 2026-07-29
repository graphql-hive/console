import type { PostgresDatabasePool } from '@hive/postgres';
import type { AlertChannelRow, NotificationEvent } from './metric-alert-notifier.js';
import { makeLogger, makeRule } from './metric-alert-test-utils.js';

const postMessage = vi.fn(async (_args: { attachments: Array<{ color: string }> }) => ({
  ok: true,
}));

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage };
  },
}));

const { sendSlackNotification } = await import('./metric-alert-notifier.js');

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
    rule: makeRule({ type: 'ERROR_RATE', thresholdValue: 2, severity: 'WARNING' }),
    currentValue: 2.15,
    previousValue: null,
    organizationSlug: 'the-guild',
    projectSlug: 'graphql-hive',
    targetSlug: 'production',
    ...overrides,
  };
}

async function colorFor(event: NotificationEvent): Promise<string> {
  postMessage.mockClear();
  await sendSlackNotification({ channel, event, pg, logger: makeLogger().logger });
  return postMessage.mock.calls[0][0].attachments[0].color;
}

describe('sendSlackNotification', () => {
  test('uses the severity hex for the firing state', async () => {
    await expect(colorFor(makeEvent())).resolves.toBe('#c5870d');
  });

  // Slack renders `good`/`warning`/`danger` as a grey bar, so resolved must be a hex.
  test('uses a green hex for the resolved state', async () => {
    await expect(colorFor(makeEvent({ state: 'resolved', currentValue: 1.64 }))).resolves.toBe(
      '#2ECC71',
    );
  });
});
