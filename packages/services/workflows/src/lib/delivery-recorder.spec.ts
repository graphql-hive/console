import {
  createDeliveryRecorder,
  deliveryOutcome,
  trackDelivery,
  type DeliveryRecorder,
} from './delivery-recorder.js';
import { makeLogger } from './metric-alert-test-utils.js';

const meta = {
  organizationId: 'o1',
  deliveryType: 'WEBHOOK' as const,
  destination: 'c1',
  event: 'schema_change' as const,
  idempotencyKey: 'schema-change:v1:c1',
  attempt: 2,
  maxAttempts: 25,
  metadata: { 'Hive-Request-ID': 'r1' },
};

function makeClient(command = vi.fn(async () => {})) {
  return { client: { command } as any, command };
}

describe('deliveryOutcome', () => {
  test('bounds the text to what the column holds', () => {
    expect(deliveryOutcome(400, 'x'.repeat(2000))).toEqual({
      statusCode: 400,
      statusText: 'x'.repeat(512),
    });
  });
});

describe('trackDelivery', () => {
  test('records a successful attempt with the response and resolves with the value', async () => {
    const record = vi.fn(async () => {});
    const recorder: DeliveryRecorder = { record };

    await expect(
      trackDelivery(
        recorder,
        meta,
        async () => ({ outcome: { statusCode: 200, statusText: 'OK' }, value: 'sent' }),
        () => null,
      ),
    ).resolves.toBe('sent');

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ...meta, ok: true, statusCode: 200, statusText: 'OK' }),
    );
  });

  test('records what the sender read from its error and rethrows so the job can retry', async () => {
    const record = vi.fn(async () => {});
    const error = new Error('Response code 503 (Service Unavailable)');
    const describeError = vi.fn(() => deliveryOutcome(503, 'Service Unavailable'));

    await expect(
      trackDelivery({ record }, meta, () => Promise.reject(error), describeError),
    ).rejects.toBe(error);

    expect(describeError).toHaveBeenCalledWith(error);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: 503, statusText: 'Service Unavailable' }),
    );
  });

  test('masks an error the sender did not recognise', async () => {
    const record = vi.fn(async () => {});
    const error = new TypeError("Cannot read properties of undefined (reading 'id')");

    await expect(
      trackDelivery(
        { record },
        meta,
        () => Promise.reject(error),
        () => null,
      ),
    ).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, statusCode: null, statusText: 'Unexpected error' }),
    );
  });
});

describe('createDeliveryRecorder', () => {
  const attempt = { ...meta, ok: true, statusCode: 200, statusText: 'OK', durationMs: 5 };

  test('writes one statement per attempt', async () => {
    const { client, command } = makeClient();
    const recorder = createDeliveryRecorder(client, makeLogger().logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();

    expect(command).toHaveBeenCalledTimes(1);
  });

  test('is a no-op without ClickHouse', async () => {
    const recorder = createDeliveryRecorder(null, makeLogger().logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();
  });

  test('a failing insert is logged and never reaches the caller', async () => {
    const errors: unknown[][] = [];
    const { logger } = makeLogger();
    logger.error = (...args: unknown[]) => void errors.push(args);
    const { client } = makeClient(vi.fn(async () => Promise.reject(new Error('clickhouse down'))));
    const recorder = createDeliveryRecorder(client, logger);

    await expect(recorder.record(attempt)).resolves.toBeUndefined();

    expect(errors).toHaveLength(1);
  });
});
