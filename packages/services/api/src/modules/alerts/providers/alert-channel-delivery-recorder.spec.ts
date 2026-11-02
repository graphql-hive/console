import { vi } from 'vitest';
import {
  AlertChannelDeliveryRecorder,
  describeDeliveryError,
} from './alert-channel-delivery-recorder';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('@hive/service-common', () => ({ getRequestId: () => undefined }));
vi.mock('../../operations/providers/clickhouse-client', () => ({
  ClickHouse: class {},
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings.join('?'),
    values,
  }),
}));

function createRecorder() {
  const postQuery = vi.fn().mockResolvedValue(undefined);
  const errorLog = vi.fn();
  const logger = { child: () => ({ debug: vi.fn(), error: errorLog }) };
  const recorder = new AlertChannelDeliveryRecorder({ postQuery } as any, logger as any, '1.2.3');

  return { recorder, postQuery, errorLog };
}

const meta = {
  organizationId: 'o1',
  projectId: 'p1',
  channelId: 'c1',
  channelType: 'DISCORD' as const,
  event: 'schema_change' as const,
  metadata: { 'Hive-Request-ID': 'r1' },
};

describe('describeDeliveryError', () => {
  test.each<[string, unknown, { statusCode: number | null; statusText: string }]>([
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
      'HiveHttpClientError with a status',
      Object.assign(new Error('Response code 404 (Not Found)'), {
        code: 'ERR_NON_2XX_3XX_RESPONSE',
        statusCode: 404,
        statusText: 'Not Found',
      }),
      { statusCode: 404, statusText: 'Not Found' },
    ],
    [
      'Teams webhook error',
      Object.assign(new Error('Failed to send Microsoft Teams message: Bad Request'), {
        statusCode: 400,
        statusText: 'Bad Request',
      }),
      { statusCode: 400, statusText: 'Bad Request' },
    ],
    [
      'undici fetch failed',
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND hooks.example.com'), {
          code: 'ENOTFOUND',
        }),
      }),
      { statusCode: null, statusText: 'ENOTFOUND: getaddrinfo ENOTFOUND hooks.example.com' },
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

describe('AlertChannelDeliveryRecorder', () => {
  test('track records a successful attempt with the response and resolves with the value', async () => {
    const { recorder } = createRecorder();
    const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);

    await expect(
      recorder.track(meta, async () => ({
        outcome: { statusCode: 204, statusText: 'No Content' },
        value: 'sent',
      })),
    ).resolves.toBe('sent');

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ...meta, ok: true, statusCode: 204, statusText: 'No Content' }),
    );
    expect(record.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(0);
  });

  test('track records a failed attempt and rethrows the original error', async () => {
    const { recorder } = createRecorder();
    const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);
    const error = Object.assign(new Error('Response code 404 (Not Found)'), {
      response: { statusCode: 404, statusMessage: 'Not Found' },
    });

    await expect(recorder.track(meta, () => Promise.reject(error))).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 404, statusText: 'Not Found' }),
    );
  });

  test('a failing insert is logged and never reaches the caller', async () => {
    const { recorder, postQuery, errorLog } = createRecorder();
    postQuery.mockRejectedValue(new Error('clickhouse down'));

    await expect(
      recorder.track(meta, async () => ({
        outcome: { statusCode: 200, statusText: 'OK' },
        value: undefined,
      })),
    ).resolves.toBeUndefined();

    expect(postQuery).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalled();
  });

  test('describe fills in the request id and release', () => {
    const { recorder } = createRecorder();

    expect(
      recorder.describe({
        event: 'schema_change',
        targetId: 't1',
        schemaId: 'v1',
        idempotencyKey: 'k',
      }),
    ).toEqual({
      requestId: expect.any(String),
      event: 'schema_change',
      targetId: 't1',
      schemaId: 'v1',
      release: '1.2.3',
      idempotencyKey: 'k',
    });
  });
});
