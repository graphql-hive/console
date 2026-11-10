import { vi } from 'vitest';
import { DeliveryReader, toDelivery, toDeliveryHealth } from './delivery-reader';

vi.mock('@hive/service-common', () => ({ getRequestId: () => undefined }));
vi.mock('../../operations/providers/clickhouse-client', () => ({
  ClickHouse: class {},
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    {
      raw: (value: string) => ({ sql: value, values: [] }),
      array: (values: unknown[], type: string) => ({ sql: `{${type}}`, values }),
    },
  ),
}));

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn() }) };

function createReader(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ data: rows, rows: rows.length });
  const reader = new DeliveryReader(
    { query, translateWindow: () => ({ sql: '1 HOUR', values: [] }) } as any,
    logger as any,
  );
  return { reader, query };
}

const healthRow = {
  recent_attempts: 10,
  recent_failures: 10,
  last_success_at: 1_762_000_000,
  last_failure_at: 1_762_003_600,
  last_status_code: 404,
  last_status_text: 'Not Found',
  failing_since: 1_762_001_800,
};

describe('toDeliveryHealth', () => {
  test('UNKNOWN when nothing was recorded', () => {
    expect(
      toDeliveryHealth({
        recent_attempts: 0,
        recent_failures: 0,
        last_success_at: 0,
        last_failure_at: 0,
        last_status_code: 0,
        last_status_text: '',
        failing_since: 0,
      }),
    ).toEqual({
      status: 'UNKNOWN',
      lastSuccessAt: null,
      lastFailureAt: null,
      lastStatusCode: null,
      lastStatusText: null,
      failingSince: null,
    });
  });

  test('HEALTHY while any of the last ten attempts succeeded, keeping the older failure', () => {
    expect(toDeliveryHealth({ ...healthRow, recent_failures: 9, failing_since: 0 })).toEqual({
      status: 'HEALTHY',
      lastSuccessAt: new Date(1_762_000_000_000),
      lastFailureAt: new Date(1_762_003_600_000),
      lastStatusCode: 404,
      lastStatusText: 'Not Found',
      failingSince: null,
    });
  });

  test('HEALTHY with fewer than ten attempts, even when all of them failed', () => {
    expect(
      toDeliveryHealth({
        ...healthRow,
        recent_attempts: 3,
        recent_failures: 3,
        last_success_at: 0,
      }),
    ).toEqual(
      expect.objectContaining({ status: 'HEALTHY', lastSuccessAt: null, failingSince: null }),
    );
  });

  test('FAILING once the last ten attempts all failed, with the start of the streak', () => {
    expect(toDeliveryHealth(healthRow)).toEqual(
      expect.objectContaining({
        status: 'FAILING',
        failingSince: new Date(1_762_001_800_000),
        lastStatusCode: 404,
      }),
    );
  });

  test('a failure in the same second as the last success starts the streak at the latest failure', () => {
    expect(toDeliveryHealth({ ...healthRow, failing_since: 0 }).failingSince).toEqual(
      new Date(1_762_003_600_000),
    );
  });

  test('a failure without an HTTP response has no status code or text', () => {
    expect(toDeliveryHealth({ ...healthRow, last_status_code: 0, last_status_text: '' })).toEqual(
      expect.objectContaining({ lastStatusCode: null, lastStatusText: null }),
    );
  });
});

describe('toDelivery', () => {
  test('maps a recorded attempt', () => {
    expect(
      toDelivery({
        unix_timestamp: 1_762_000_000,
        event: 'schema_change',
        destination: 'c1',
        idempotency_key: 'schema-change:v1:c1',
        ok: 0,
        status_code: 404,
        status_text: 'Not Found',
        duration_ms: 123,
        attempt: 2,
        max_attempts: 25,
        metadata: { 'Hive-Request-ID': 'r1' },
      }),
    ).toEqual({
      timestamp: new Date(1_762_000_000_000),
      event: 'SCHEMA_CHANGE',
      destination: 'c1',
      idempotencyKey: 'schema-change:v1:c1',
      ok: false,
      statusCode: 404,
      statusText: 'Not Found',
      durationMs: 123,
      attempt: 2,
      maxAttempts: 25,
      metadata: { 'Hive-Request-ID': 'r1' },
    });
  });

  test('a Slack attempt has no HTTP status', () => {
    expect(
      toDelivery({
        unix_timestamp: 1_762_000_000,
        event: 'metric_alert',
        destination: 'c1',
        idempotency_key: 'metric-alert:s1:c1',
        ok: 1,
        status_code: 0,
        status_text: 'ok',
        duration_ms: 5,
        attempt: 1,
        max_attempts: 1,
        metadata: {},
      }),
    ).toEqual(expect.objectContaining({ event: 'METRIC_ALERT', ok: true, statusCode: null }));
  });

  test('an attempt recorded without a key has none', () => {
    expect(
      toDelivery({
        unix_timestamp: 1_762_000_000,
        event: 'audit_log_export',
        destination: 'auditor@example.com',
        idempotency_key: '',
        ok: 1,
        status_code: 200,
        status_text: 'OK',
        duration_ms: 90,
        attempt: 1,
        max_attempts: 25,
        metadata: {},
      }),
    ).toEqual(expect.objectContaining({ idempotencyKey: null }));
  });
});

describe('DeliveryReader', () => {
  test('getOverTime parses the buckets and their dates as UTC', async () => {
    const { reader } = createReader([
      { date: '2026-11-02 10:00:00', total: '3', failed: '1' },
      { date: '2026-11-02 11:00:00', total: '0', failed: '0' },
      { date: '2026-11-02 12:00:00', total: '2', failed: '2' },
    ]);

    await expect(
      reader.getOverTime({
        organizationId: 'o1',
        deliveryType: 'WEBHOOK',
        destination: 'c1',
        period: { from: new Date('2026-11-02T10:00:00Z'), to: new Date('2026-11-02T13:00:00Z') },
        resolution: 3,
      }),
    ).resolves.toEqual([
      { date: new Date('2026-11-02T10:00:00Z'), total: 3, failed: 1 },
      { date: new Date('2026-11-02T11:00:00Z'), total: 0, failed: 0 },
      { date: new Date('2026-11-02T12:00:00Z'), total: 2, failed: 2 },
    ]);
  });

  test('getTotals reads the quoted 64-bit counts as numbers', async () => {
    const { reader } = createReader([{ total: '5', failed: '3' }]);

    await expect(
      reader.getTotals({
        organizationId: 'o1',
        deliveryType: 'WEBHOOK',
        destination: 'c1',
        period: { from: new Date('2026-11-02T10:00:00Z'), to: new Date('2026-11-02T13:00:00Z') },
      }),
    ).resolves.toEqual({ total: 5, failed: 3 });
  });

  test('getLog returns the parsed attempts', async () => {
    const { reader } = createReader([
      {
        unix_timestamp: 1_762_000_000,
        event: 'channel_confirmation',
        destination: 'c1',
        idempotency_key: 'channel-confirmation:created:c1',
        ok: 1,
        status_code: 200,
        status_text: 'OK',
        duration_ms: 40,
        attempt: 1,
        max_attempts: 1,
        metadata: { 'Hive-Event': 'channel_confirmation' },
      },
    ]);

    await expect(
      reader.getLog({
        organizationId: 'o1',
        deliveryType: 'WEBHOOK',
        destination: 'c1',
        period: { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-03T00:00:00Z') },
      }),
    ).resolves.toEqual([
      expect.objectContaining({ event: 'CHANNEL_CONFIRMATION', ok: true, statusCode: 200 }),
    ]);
  });
});

describe('getLatestByKey', () => {
  const row = {
    unix_timestamp: 1_762_171_205,
    event: 'organization_invitation',
    destination: 'alice@example.com',
    idempotency_key: 'organization-invitation:2026-11-03T10:00:00.000Z:alice@example.com',
    ok: 1,
    status_code: 200,
    status_text: 'OK',
    duration_ms: 120,
    attempt: 1,
    max_attempts: 25,
    metadata: { subject: 'You have been invited to join Acme', message_id: 'pm-1' },
  };

  test('keys the newest attempt by its idempotency key', async () => {
    const bobRow = {
      ...row,
      destination: 'bob@example.com',
      idempotency_key: 'organization-invitation:2026-11-03T10:00:00.000Z:bob@example.com',
      ok: 0,
    };
    const { reader } = createReader([row, bobRow]);

    const latest = await reader.getLatestByKey({
      organizationId: 'o1',
      deliveryType: 'EMAIL',
      keys: [row.idempotency_key, bobRow.idempotency_key],
      since: new Date('2026-11-03T10:00:00Z'),
    });

    expect([...latest.keys()]).toEqual([row.idempotency_key, bobRow.idempotency_key]);
    expect(latest.get(row.idempotency_key)).toEqual(toDelivery(row));
    expect(latest.get(bobRow.idempotency_key)?.ok).toBe(false);
  });

  test('asks ClickHouse nothing when there are no keys', async () => {
    const { reader, query } = createReader([]);

    await expect(
      reader.getLatestByKey({
        organizationId: 'o1',
        deliveryType: 'EMAIL',
        keys: [],
        since: new Date('2026-11-03T10:00:00Z'),
      }),
    ).resolves.toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });
});
