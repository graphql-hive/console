import {
  createAlertChannelDeliveryRecorder,
  describeDeliveryError,
  trackDelivery,
  type AlertChannelDeliveryRecorder,
} from './alert-channel-delivery-recorder.js';
import { makeLogger } from './metric-alert-test-utils.js';

const meta = {
  organizationId: 'o1',
  projectId: 'p1',
  channelId: 'c1',
  channelType: 'WEBHOOK' as const,
  event: 'schema_change' as const,
  attempt: 2,
  metadata: { 'Hive-Request-ID': 'r1' },
};

function makeClient(command = vi.fn(async () => {})) {
  return { client: { command } as any, command };
}

describe('describeDeliveryError', () => {
  test.each<[string, unknown, { statusCode: number | null; statusText: string }]>([
    [
      'got HTTP error',
      Object.assign(new Error('Response code 404 (Not Found)'), {
        code: 'ERR_NON_2XX_3XX_RESPONSE',
        response: { statusCode: 404, statusMessage: 'Not Found' },
      }),
      { statusCode: 404, statusText: 'Not Found' },
    ],
    [
      'got timeout',
      Object.assign(new Error("Timeout awaiting 'request' for 10000ms"), { code: 'ETIMEDOUT' }),
      { statusCode: null, statusText: "ETIMEDOUT: Timeout awaiting 'request' for 10000ms" },
    ],
    [
      'Slack platform error',
      {
        code: 'slack_webapi_platform_error',
        message: 'An API error occurred: channel_not_found',
        data: { ok: false, error: 'channel_not_found' },
      },
      { statusCode: null, statusText: 'channel_not_found' },
    ],
    [
      'Slack HTTP error',
      {
        code: 'slack_webapi_http_error',
        message: 'An HTTP protocol error occurred: statusCode = 500',
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      },
      { statusCode: 500, statusText: 'Internal Server Error' },
    ],
    [
      'Slack rate limit',
      { code: 'slack_webapi_rate_limited_error', message: 'A rate-limit has been reached' },
      { statusCode: 429, statusText: 'rate_limited' },
    ],
    [
      'Slack request error',
      {
        code: 'slack_webapi_request_error',
        message: 'A request error occurred: ECONNRESET',
        original: Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
      },
      { statusCode: null, statusText: 'ECONNRESET: socket hang up' },
    ],
    ['plain error', new Error('boom'), { statusCode: null, statusText: 'boom' }],
    ['non-error', 'nope', { statusCode: null, statusText: 'nope' }],
  ])('%s', (_name, error, expected) => {
    expect(describeDeliveryError(error)).toEqual(expected);
  });

  test('truncates long status text', () => {
    expect(describeDeliveryError(new Error('x'.repeat(2000))).statusText).toHaveLength(512);
  });
});

describe('trackDelivery', () => {
  test('records a successful attempt with the response and resolves with the value', async () => {
    const record = vi.fn(async () => {});
    const recorder: AlertChannelDeliveryRecorder = { record };

    await expect(
      trackDelivery(recorder, meta, async () => ({
        outcome: { statusCode: 200, statusText: 'OK' },
        value: 'sent',
      })),
    ).resolves.toBe('sent');

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ...meta, ok: true, statusCode: 200, statusText: 'OK' }),
    );
  });

  test('records a failed attempt and rethrows so the job can retry', async () => {
    const record = vi.fn(async () => {});
    const error = Object.assign(new Error('Response code 503 (Service Unavailable)'), {
      response: { statusCode: 503, statusMessage: 'Service Unavailable' },
    });

    await expect(trackDelivery({ record }, meta, () => Promise.reject(error))).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 503, statusText: 'Service Unavailable' }),
    );
  });
});

describe('createAlertChannelDeliveryRecorder', () => {
  const attempt = { ...meta, ok: true, statusCode: 200, statusText: 'OK', durationMs: 5 };

  test('writes one statement per attempt', async () => {
    const { client, command } = makeClient();
    const recorder = createAlertChannelDeliveryRecorder(client, makeLogger().logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();

    expect(command).toHaveBeenCalledTimes(1);
  });

  test('is a no-op without ClickHouse', async () => {
    const recorder = createAlertChannelDeliveryRecorder(null, makeLogger().logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();
  });

  test('a failing insert is logged and never reaches the caller', async () => {
    const errors: unknown[][] = [];
    const { logger } = makeLogger();
    logger.error = (...args: unknown[]) => void errors.push(args);
    const { client } = makeClient(vi.fn(async () => Promise.reject(new Error('clickhouse down'))));
    const recorder = createAlertChannelDeliveryRecorder(client, logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();

    expect(errors).toHaveLength(1);
  });
});
