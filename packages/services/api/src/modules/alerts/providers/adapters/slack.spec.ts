import { vi } from 'vitest';
import { AlertChannelDeliveryRecorder } from '../alert-channel-delivery-recorder';
import type { ChannelConfirmationInput } from './common';
import { SlackCommunicationAdapter } from './slack';

const postMessage = vi.fn(async (_args: Record<string, unknown>) => ({ ok: true }));
let constructedWith: { token: string; options: Record<string, unknown> | undefined } | null = null;

vi.mock('@slack/web-api', () => ({
  ErrorCode: {
    RequestError: 'slack_webapi_request_error',
    HTTPError: 'slack_webapi_http_error',
    PlatformError: 'slack_webapi_platform_error',
    RateLimitedError: 'slack_webapi_rate_limited_error',
  },
  WebClient: class {
    chat = { postMessage };
    constructor(token: string, options?: Record<string, unknown>) {
      constructedWith = { token, options };
    }
  },
}));
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('@hive/service-common', () => ({ getRequestId: () => 'req-1' }));
vi.mock('../../../operations/providers/clickhouse-client', () => ({
  ClickHouse: class {},
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings.join('?'),
    values,
  }),
}));

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn() }) };

function createAdapter() {
  const recorder = new AlertChannelDeliveryRecorder(
    { postQuery: vi.fn().mockResolvedValue(undefined) } as any,
    logger as any,
    '1.2.3',
  );
  const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);
  const adapter = new SlackCommunicationAdapter(logger as any, 'app-base-url', recorder);

  return { adapter, record };
}

const confirmation = {
  event: {
    kind: 'created',
    organization: { id: 'org-id', cleanId: 'org', slug: 'org', name: 'Org' },
    project: { id: 'project-id', cleanId: 'project', slug: 'project', name: 'Project' },
  },
  channel: {
    id: 'channel-id',
    projectId: 'project-id',
    type: 'SLACK',
    name: 'general',
    createdAt: new Date().toISOString(),
    slackChannel: 'general',
    webhookEndpoint: null,
  },
  integrations: { slack: { token: 'xoxb-token' } },
} satisfies ChannelConfirmationInput;

const expectedMetadata = {
  event_type: 'channel_confirmation',
  event_payload: {
    hive_request_id: 'req-1',
    idempotency_key: 'channel-confirmation:created:channel-id',
    user_agent: 'Hive-Webhooks/1.2.3',
  },
};

describe('SlackCommunicationAdapter', () => {
  beforeEach(() => {
    postMessage.mockClear();
    constructedWith = null;
  });

  test('sends the channel confirmation with Hive metadata and records the attempt', async () => {
    const { adapter, record } = createAdapter();

    await adapter.sendChannelConfirmation(confirmation);

    expect(constructedWith).toEqual({
      token: 'xoxb-token',
      options: expect.objectContaining({ retryConfig: { retries: 3 } }),
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'general', metadata: expectedMetadata }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-id',
        projectId: 'project-id',
        channelId: 'channel-id',
        channelType: 'SLACK',
        event: 'channel_confirmation',
        ok: true,
        statusCode: null,
        statusText: 'ok',
        metadata: { event_type: 'channel_confirmation', ...expectedMetadata.event_payload },
      }),
    );
  });

  test('a Slack platform error is recorded as a failed attempt and still swallowed', async () => {
    const { adapter, record } = createAdapter();
    postMessage.mockRejectedValueOnce({
      code: 'slack_webapi_platform_error',
      message: 'An API error occurred: channel_not_found',
      data: { ok: false, error: 'channel_not_found' },
    });

    await expect(adapter.sendChannelConfirmation(confirmation)).resolves.toBeUndefined();

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: null, statusText: 'channel_not_found' }),
    );
  });
});
