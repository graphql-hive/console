import { makeLogger } from '../metric-alert-test-utils.js';
import { describeWebhookError, sendWebhook } from './send-webhook.js';

const gotPost = vi.fn(async (_url: string, _options: Record<string, any>) => ({
  statusCode: 200,
  statusMessage: 'OK',
}));

vi.mock('got', () => ({
  default: { post: (...args: unknown[]) => gotPost(...(args as [any, any])) },
}));

const headers = {
  'Hive-Request-ID': 'req-1',
  'Hive-Event': 'schema_change',
  'Idempotency-Key': 'schema-change:v1:c1',
};

function makeDelivery() {
  const record = vi.fn(async () => {});
  return {
    record,
    delivery: {
      recorder: { record },
      meta: {
        organizationId: 'o1',
        deliveryType: 'WEBHOOK' as const,
        destination: 'c1',
        event: 'schema_change' as const,
        attempt: 1,
        maxAttempts: 25,
        metadata: headers,
      },
    },
  };
}

describe('sendWebhook', () => {
  beforeEach(() => {
    gotPost.mockClear();
  });

  // graphile-worker increments `attempts` before running the job, so on the final
  // attempt `attempts === max_attempts` and the webhook is never actually posted.
  test('gives up without posting once the retry budget is spent', async () => {
    const { logger, warnings } = makeLogger();
    const { record, delivery } = makeDelivery();

    const result = await sendWebhook(logger, null, {
      attempt: 25,
      maxAttempts: 25,
      endpoint: 'http://localhost:9876/never-called',
      data: {},
      delivery,
    });

    expect(result).toEqual({ status: 'gave-up' });
    expect(warnings).toHaveLength(1);
    expect(gotPost).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  test('sends the headers and records the response of a delivered webhook', async () => {
    const { record, delivery } = makeDelivery();

    await expect(
      sendWebhook(makeLogger().logger, null, {
        attempt: 1,
        maxAttempts: 25,
        endpoint: 'https://hooks.example.com/hive',
        data: { hello: 'world' },
        headers,
        delivery,
      }),
    ).resolves.toEqual({ status: 'sent' });

    expect(gotPost.mock.calls[0][1].headers).toEqual(expect.objectContaining(headers));
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        ...delivery.meta,
        ok: true,
        statusCode: 200,
        statusText: 'OK',
      }),
    );
  });

  test('records the status the destination answered and still rejects for a retry', async () => {
    const { record, delivery } = makeDelivery();
    const error = Object.assign(new Error('Response code 503 (Service Unavailable)'), {
      code: 'ERR_NON_2XX_3XX_RESPONSE',
      response: { statusCode: 503, statusMessage: 'Service Unavailable' },
    });
    gotPost.mockRejectedValueOnce(error);

    await expect(
      sendWebhook(makeLogger().logger, null, {
        attempt: 3,
        maxAttempts: 25,
        endpoint: 'https://hooks.example.com/hive',
        data: {},
        headers,
        delivery,
      }),
    ).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 503, statusText: 'Service Unavailable' }),
    );
  });

  test('forwards the headers inside the request broker payload', async () => {
    const { delivery } = makeDelivery();

    await sendWebhook(
      makeLogger().logger,
      { endpoint: 'https://broker.example.com', signature: 'sig' },
      {
        attempt: 1,
        maxAttempts: 25,
        endpoint: 'https://hooks.example.com/hive',
        data: {},
        headers,
        delivery,
      },
    );

    const [url, options] = gotPost.mock.calls[0];
    expect(url).toBe('https://broker.example.com');
    expect(options.json.url).toBe('https://hooks.example.com/hive');
    expect(options.json.headers).toEqual(expect.objectContaining(headers));
  });
});

describe('describeWebhookError', () => {
  test.each<[string, unknown, { statusCode: number | null; statusText: string } | null]>([
    [
      'the endpoint answered',
      Object.assign(new Error('Response code 404 (Not Found)'), {
        code: 'ERR_NON_2XX_3XX_RESPONSE',
        response: { statusCode: 404, statusMessage: 'Not Found' },
      }),
      { statusCode: 404, statusText: 'Not Found' },
    ],
    [
      'the request timed out',
      Object.assign(new Error("Timeout awaiting 'request' for 10000ms"), { code: 'ETIMEDOUT' }),
      { statusCode: null, statusText: 'Timed out' },
    ],
    [
      'the connection was refused',
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:443'), { code: 'ECONNREFUSED' }),
      null,
    ],
    [
      'the host did not resolve',
      Object.assign(new Error('getaddrinfo ENOTFOUND hooks.example.com'), { code: 'ENOTFOUND' }),
      null,
    ],
    ['an exception of our own', new TypeError('Cannot read properties of undefined'), null],
    ['not an error', 'nope', null],
  ])('%s', (_name, error, expected) => {
    expect(describeWebhookError(error)).toEqual(expected);
  });
});
