import type { PostgresDatabasePool } from '@hive/postgres';
import { Encryptor } from '@hive/service-common';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';
import type { AlertChannelRow, NotificationEvent } from './metric-alert-notifier.js';
import { makeLogger, makeRule } from './metric-alert-test-utils.js';

const postMessage = vi.fn(
  async (_args: {
    unfurl_links?: boolean;
    attachments: Array<{ color: string; blocks: Array<{ text: { text: string } }> }>;
  }) => ({ ok: true }),
);

// The token the client was constructed with is the whole point of the decrypt fix, so
// the stub has to capture it. It previously ignored the argument, which is exactly how
// an encrypted token reached Slack unnoticed.
let constructedWithToken: string | null = null;

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage };
    constructor(token: string) {
      constructedWithToken = token;
    }
  },
}));

const sendWebhook = vi.fn(
  async (): Promise<{ status: 'sent' | 'gave-up' }> => ({
    status: 'sent',
  }),
);

vi.mock('./webhooks/send-webhook.js', () => ({
  sendWebhook: (...args: unknown[]) => sendWebhook(...(args as [])),
}));

const {
  buildAlertUrl,
  buildWebhookPayload,
  sendDiscordNotification,
  sendSlackNotification,
  summarizeNotificationResult,
} = await import('./metric-alert-notifier.js');

const SLACK_TOKEN = 'xoxb-test-token';
const encryptor = new Encryptor('test-secret');

// Legacy shape: rows written before the token column was encrypted are still plain text.
const pg = {
  maybeOneFirst: async () => SLACK_TOKEN,
} as unknown as PostgresDatabasePool;

function pgReturning(token: string | null) {
  return { maybeOneFirst: async () => token } as unknown as PostgresDatabasePool;
}

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
    ruleId: 'r1',
    rule: makeRule({ type: 'ERROR_RATE', thresholdValue: 2, severity: 'WARNING' }),
    currentValue: 2.15,
    previousValue: null,
    organizationSlug: 'the-guild',
    projectSlug: 'graphql-hive',
    targetSlug: 'production',
    ...overrides,
  };
}

const WEB_APP_URL = 'https://app.graphql-hive.com';
const ALERT_URL = `${WEB_APP_URL}/the-guild/graphql-hive/production/alerts/r1`;

describe('buildAlertUrl', () => {
  test('points at the rule detail page', () => {
    expect(buildAlertUrl(WEB_APP_URL, makeEvent())).toBe(ALERT_URL);
  });

  test('returns null when the Hive Console URL is not configured', () => {
    expect(buildAlertUrl(null, makeEvent())).toBeNull();
  });
});

describe('buildWebhookPayload', () => {
  test('includes the alert url', () => {
    expect(buildWebhookPayload(makeEvent(), WEB_APP_URL).url).toBe(ALERT_URL);
  });

  // The key must stay present so consumers don't see the field appear and
  // disappear; the web app's alert-notification-preview.spec asserts the same
  // key list.
  test('keeps the url key as null when the Hive Console URL is not configured', () => {
    const payload = buildWebhookPayload(makeEvent(), null);

    expect(payload.url).toBeNull();
    expect('url' in payload).toBe(true);
  });
});

async function post(event: NotificationEvent, webAppUrl: string | null = null) {
  postMessage.mockClear();
  await sendSlackNotification({
    channel,
    event,
    pg,
    logger: makeLogger().logger,
    webAppUrl,
    crypto: encryptor,
  });
  const [args] = postMessage.mock.calls[0];
  return { args, attachment: args.attachments[0] };
}

async function colorFor(event: NotificationEvent): Promise<string> {
  return (await post(event)).attachment.color;
}

async function bodyFor(event: NotificationEvent, webAppUrl: string | null): Promise<string> {
  return (await post(event, webAppUrl)).attachment.blocks[0].text.text;
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

  test('links back to the rule in Hive Console', async () => {
    await expect(bodyFor(makeEvent(), WEB_APP_URL)).resolves.toContain(
      `<${ALERT_URL}|View alert in Hive>`,
    );
  });

  // Without this the console link renders a preview card under every alert.
  test('does not let Slack unfurl the link', async () => {
    const { args } = await post(makeEvent(), WEB_APP_URL);

    expect(args.unfurl_links).toBe(false);
  });

  test('omits the link when the Hive Console URL is not configured', async () => {
    await expect(bodyFor(makeEvent(), null)).resolves.not.toContain('View alert in Hive');
  });

  test('reports a delivery', async () => {
    const result = await sendSlackNotification({
      channel,
      event: makeEvent(),
      pg,
      logger: makeLogger().logger,
      webAppUrl: null,
      crypto: encryptor,
    });

    expect(result).toEqual({ status: 'sent' });
  });

  test('skips without posting when the channel has no slack channel name', async () => {
    postMessage.mockClear();
    const { logger, warnings } = makeLogger();

    const result = await sendSlackNotification({
      channel: { ...channel, slackChannel: null },
      event: makeEvent(),
      pg,
      logger,
      webAppUrl: null,
      crypto: encryptor,
    });

    expect(result).toEqual({ status: 'skipped-config', reason: 'no-slack-channel' });
    expect(postMessage).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
  });

  // Used to be indistinguishable from a successful send, which is how a whole org
  // with no Slack integration looked healthy on the dashboard.
  test('skips without posting when the organization has no slack token', async () => {
    postMessage.mockClear();
    const { logger, warnings } = makeLogger();

    const result = await sendSlackNotification({
      channel,
      event: makeEvent(),
      pg: pgReturning(null),
      logger,
      webAppUrl: null,
      crypto: encryptor,
    });

    expect(result).toEqual({ status: 'skipped-config', reason: 'no-slack-token' });
    expect(postMessage).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
  });
});

// The bug this guards: the column is written encrypted by the API, but the workflows
// service used to hand the raw column value to Slack, which answered `invalid_auth`.
describe('sendSlackNotification token decryption', () => {
  async function send(token: string | null, crypto: Encryptor | null = encryptor) {
    postMessage.mockClear();
    constructedWithToken = null;
    const { logger } = makeLogger();

    const result = await sendSlackNotification({
      channel,
      event: makeEvent(),
      pg: pgReturning(token),
      logger,
      webAppUrl: null,
      crypto,
    });

    return { result, token: constructedWithToken };
  }

  test('decrypts an encrypted token before authenticating to Slack', async () => {
    const { result, token } = await send(encryptor.encrypt(SLACK_TOKEN));

    expect(token).toBe(SLACK_TOKEN);
    expect(result).toEqual({ status: 'sent' });
  });

  // Orgs that connected Slack before the column was encrypted still hold plain text,
  // and the API tolerates them, so this path must keep working.
  test('passes a legacy plaintext token through untouched', async () => {
    const { result, token } = await send(SLACK_TOKEN);

    expect(token).toBe(SLACK_TOKEN);
    expect(result).toEqual({ status: 'sent' });
  });

  test('does not post when ENCRYPTION_SECRET is not configured', async () => {
    const { result, token } = await send(encryptor.encrypt(SLACK_TOKEN), null);

    expect(result).toEqual({ status: 'failed-config', reason: 'no-encryption-secret' });
    expect(token).toBeNull();
    expect(postMessage).not.toHaveBeenCalled();
  });

  // Retrying cannot fix a wrong secret, so this must resolve rather than throw --
  // throwing would burn all 25 graphile-worker attempts.
  test('reports a config failure without throwing when the secret is wrong', async () => {
    const encryptedElsewhere = new Encryptor('a-different-secret').encrypt(SLACK_TOKEN);

    const { result, token } = await send(encryptedElsewhere);

    expect(result).toEqual({ status: 'failed-config', reason: 'decrypt-failed' });
    expect(token).toBeNull();
    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('summarizeNotificationResult', () => {
  test('only a real send counts as delivered', () => {
    expect(summarizeNotificationResult({ status: 'sent' })).toEqual({
      outcome: 'sent',
      delivered: true,
      reason: null,
    });
  });

  test('carries the skip reason through for the span attribute', () => {
    expect(
      summarizeNotificationResult({ status: 'skipped-config', reason: 'no-slack-token' }),
    ).toEqual({ outcome: 'skipped-config', delivered: false, reason: 'no-slack-token' });
  });

  test('a config failure is not a delivery', () => {
    expect(
      summarizeNotificationResult({ status: 'failed-config', reason: 'decrypt-failed' }),
    ).toEqual({ outcome: 'failed-config', delivered: false, reason: 'decrypt-failed' });
  });

  test('an exhausted retry budget is not a delivery', () => {
    expect(summarizeNotificationResult({ status: 'gave-up' })).toEqual({
      outcome: 'gave-up',
      delivered: false,
      reason: 'retries-exhausted',
    });
  });
});

const discordChannel: AlertChannelRow = {
  id: 'channel-2',
  type: 'DISCORD',
  name: 'Alerts',
  slackChannel: null,
  webhookEndpoint: 'https://discord.com/api/webhooks/1/token',
};

type DiscordEmbed = { title: string; url?: string; color: number; description: string };

async function postDiscord(
  event: NotificationEvent,
  webAppUrl: string | null = null,
  channel: AlertChannelRow = discordChannel,
) {
  const { logger, warnings } = makeLogger();
  sendWebhook.mockClear();
  const result = await sendDiscordNotification({
    channel,
    event,
    requestBroker: null,
    logger,
    idempotencyKey: 'key-1',
    attempt: 1,
    maxAttempts: 3,
    webAppUrl,
  });
  const call = sendWebhook.mock.calls[0] as unknown as
    | [unknown, unknown, { data: { embeds: DiscordEmbed[] } }]
    | undefined;
  return { embed: call?.[2].data.embeds[0], result, warnings };
}

describe('sendDiscordNotification', () => {
  // Discord wants an integer, not the hex string Slack and Teams pass through.
  test('uses the severity color as an integer for the firing state', async () => {
    const { embed } = await postDiscord(makeEvent());

    expect(embed?.color).toBe(0xc5870d);
  });

  test('uses green for the resolved state', async () => {
    const { embed } = await postDiscord(makeEvent({ state: 'resolved', currentValue: 1.64 }));

    expect(embed?.color).toBe(0x2ecc71);
  });

  test('links back to the rule in Hive Console', async () => {
    const { embed } = await postDiscord(makeEvent(), WEB_APP_URL);

    expect(embed?.description).toContain(`[View alert in Hive](${ALERT_URL})`);
    expect(embed?.url).toBe(ALERT_URL);
  });

  test('omits the link when the Hive Console URL is not configured', async () => {
    const { embed } = await postDiscord(makeEvent(), null);

    expect(embed?.description).not.toContain('View alert in Hive');
    expect(embed?.url).toBeUndefined();
  });

  // Discord rejects the whole message if the description exceeds 4096, and the
  // link is appended after truncation so it survives a long change text.
  test('keeps the link when the change text is truncated', async () => {
    const event = makeEvent({
      // The metric name is the only free-text input to the change text, so it's
      // the lever for pushing the description past the cap.
      rule: makeRule({
        type: 'LATENCY',
        metric: 'P'.repeat(5000) as MetricAlertRuleRow['metric'],
        severity: 'WARNING',
      }),
    });

    const { embed } = await postDiscord(event, WEB_APP_URL);

    // Exactly at the cap proves the change text was cut to make room, not that
    // the input happened to be short enough.
    expect(embed?.description).toHaveLength(4096);
    expect(embed?.description).toContain(`[View alert in Hive](${ALERT_URL})`);
  });

  test('reports a delivery', async () => {
    const { result } = await postDiscord(makeEvent(), WEB_APP_URL);

    expect(result).toEqual({ status: 'sent' });
  });

  test('skips channels with no webhook endpoint configured', async () => {
    const { result, warnings } = await postDiscord(makeEvent(), WEB_APP_URL, {
      ...discordChannel,
      webhookEndpoint: null,
    });

    expect(result).toEqual({ status: 'skipped-config', reason: 'no-discord-endpoint' });
    expect(sendWebhook).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
  });

  // An exhausted retry budget must not be reported as a delivery, or the dedupe
  // row would suppress a redelivery the user never received.
  test('passes an exhausted retry budget through as gave-up', async () => {
    sendWebhook.mockResolvedValueOnce({ status: 'gave-up' });

    const { result } = await postDiscord(makeEvent(), WEB_APP_URL);

    expect(result).toEqual({ status: 'gave-up' });
  });
});
