import { vi } from 'vitest';
import { captureException } from '@sentry/node';
import { HiveConsoleReleaseVersion } from '../../shared/providers/tokens';
import { deliveryOutcome, DeliveryRecorder } from './delivery-recorder';

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }));
vi.mock('@hive/service-common', () => ({ getRequestId: () => undefined }));
vi.mock('../../operations/providers/clickhouse-client', () => ({
  ClickHouse: class {},
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    sql: strings.join('?'),
    values,
  }),
}));

beforeEach(() => {
  vi.mocked(captureException).mockClear();
});

function createRecorder() {
  const insert = vi.fn().mockResolvedValue(undefined);
  const errorLog = vi.fn();
  const logger = { child: () => ({ debug: vi.fn(), error: errorLog }) };
  const recorder = new DeliveryRecorder(
    { insert } as any,
    logger as any,
    new HiveConsoleReleaseVersion('1.2.3'),
  );

  return { recorder, insert, errorLog };
}

const meta = {
  organizationId: 'o1',
  deliveryType: 'DISCORD' as const,
  destination: 'c1',
  event: 'schema_change' as const,
  idempotencyKey: 'schema-change:v1:c1',
  metadata: { 'Hive-Request-ID': 'r1' },
};

describe('deliveryOutcome', () => {
  test('bounds the text to what the column holds', () => {
    expect(deliveryOutcome(400, 'x'.repeat(2000))).toEqual({
      statusCode: 400,
      statusText: 'x'.repeat(512),
    });
  });
});

describe('DeliveryRecorder', () => {
  test('track records a successful attempt with the response and resolves with the value', async () => {
    const { recorder } = createRecorder();
    const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);

    await expect(
      recorder.track(
        meta,
        async () => ({ outcome: { statusCode: 204, statusText: 'No Content' }, value: 'sent' }),
        () => null,
      ),
    ).resolves.toBe('sent');

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ...meta, ok: true, statusCode: 204, statusText: 'No Content' }),
    );
    expect(record.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(0);
  });

  test('track records what the sender read from its error and rethrows the error', async () => {
    const { recorder, errorLog } = createRecorder();
    const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);
    const error = new Error('Response code 404 (Not Found)');
    const describeError = vi.fn(() => deliveryOutcome(404, 'Not Found'));

    await expect(recorder.track(meta, () => Promise.reject(error), describeError)).rejects.toBe(
      error,
    );

    expect(describeError).toHaveBeenCalledWith(error);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 404, statusText: 'Not Found' }),
    );
    expect(errorLog).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  test('track masks an error the sender did not recognise and logs it with its cause', async () => {
    const { recorder, errorLog } = createRecorder();
    const record = vi.spyOn(recorder, 'record').mockResolvedValue(undefined);
    const error = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:443'), {
        code: 'ECONNREFUSED',
      }),
    });

    await expect(
      recorder.track(
        meta,
        () => Promise.reject(error),
        () => null,
      ),
    ).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: null, statusText: 'Unexpected error' }),
    );
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog.mock.calls[0].join(' ')).toContain(
      'ECONNREFUSED: connect ECONNREFUSED 10.0.0.5:443',
    );
    expect(captureException).toHaveBeenCalledWith(error, {
      extra: { destination: 'c1', event: 'schema_change' },
    });
  });

  test('record writes one row with the attempt and its metadata as a map literal', async () => {
    const { recorder, insert } = createRecorder();

    await recorder.record({
      ...meta,
      metadata: { 'Hive-Request-ID': "r'1", 'User-Agent': 'Hive/1 ("beta") \\ end' },
      ok: false,
      statusCode: null,
      statusText: 'ENOTFOUND: getaddrinfo ENOTFOUND hooks.example.com',
      durationMs: 12.6,
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      queryId: 'record-delivery',
      data: [
        [
          expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
          'o1',
          'DISCORD',
          'c1',
          'schema_change',
          'schema-change:v1:c1',
          1,
          1,
          0,
          0,
          'ENOTFOUND: getaddrinfo ENOTFOUND hooks.example.com',
          13,
          "{'Hive-Request-ID':'r\\'1','User-Agent':'Hive/1 (\"beta\") \\\\ end'}",
        ],
      ],
    });
  });

  test('a failing insert is logged and never reaches the caller', async () => {
    const { recorder, insert, errorLog } = createRecorder();
    insert.mockRejectedValue(new Error('clickhouse down'));

    await expect(
      recorder.track(
        meta,
        async () => ({ outcome: { statusCode: 200, statusText: 'OK' }, value: undefined }),
        () => null,
      ),
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalled();
  });

  test('describe fills in the release, and a null request id outside a request', () => {
    const { recorder } = createRecorder();

    expect(
      recorder.describe({
        event: 'schema_change',
        targetId: 't1',
        schemaId: 'v1',
        idempotencyKey: 'k',
      }),
    ).toEqual({
      requestId: null,
      event: 'schema_change',
      targetId: 't1',
      schemaId: 'v1',
      release: '1.2.3',
      idempotencyKey: 'k',
    });
  });
});
