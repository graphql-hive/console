import { vi } from 'vitest';
import {
  AlertChannelDeliveryReader,
  toDelivery,
  toDeliveryHealth,
} from './alert-channel-delivery-reader';

vi.mock('@hive/service-common', () => ({ getRequestId: () => undefined }));
vi.mock('../../operations/providers/clickhouse-client', () => ({
  ClickHouse: class {},
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
    { raw: (value: string) => ({ sql: value, values: [] }) },
  ),
}));

const logger = { child: () => ({ debug: vi.fn(), error: vi.fn() }) };

function createReader(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ data: rows, rows: rows.length });
  const reader = new AlertChannelDeliveryReader(
    { query, translateWindow: () => ({ sql: '1 HOUR', values: [] }) } as any,
    logger as any,
  );
  return { reader, query };
}

const healthRow = {
  total: 3,
  last_success_at: 1_762_000_000,
  last_failure_at: 1_762_003_600,
  last_status_code: 404,
  last_status_text: 'Not Found',
  latest_ok: 0,
  failing_since: 1_762_001_800,
};

describe('toDeliveryHealth', () => {
  test('UNKNOWN when nothing was recorded', () => {
    expect(
      toDeliveryHealth({
        total: 0,
        last_success_at: 0,
        last_failure_at: 0,
        last_status_code: 0,
        last_status_text: '',
        latest_ok: 0,
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

  test('HEALTHY when the latest attempt succeeded, keeping the older failure', () => {
    expect(toDeliveryHealth({ ...healthRow, latest_ok: 1, failing_since: 0 })).toEqual({
      status: 'HEALTHY',
      lastSuccessAt: new Date(1_762_000_000_000),
      lastFailureAt: new Date(1_762_003_600_000),
      lastStatusCode: 404,
      lastStatusText: 'Not Found',
      failingSince: null,
    });
  });

  test('FAILING with the start of the current streak', () => {
    expect(toDeliveryHealth(healthRow)).toEqual(
      expect.objectContaining({
        status: 'FAILING',
        failingSince: new Date(1_762_001_800_000),
        lastStatusCode: 404,
      }),
    );
  });

  test('a failure in the same second as the last success starts the streak at that failure', () => {
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
        ok: 0,
        status_code: 404,
        status_text: 'Not Found',
        duration_ms: 123,
        attempt: 2,
        metadata: { 'Hive-Request-ID': 'r1' },
      }),
    ).toEqual({
      timestamp: new Date(1_762_000_000_000),
      event: 'SCHEMA_CHANGE',
      ok: false,
      statusCode: 404,
      statusText: 'Not Found',
      durationMs: 123,
      attempt: 2,
      metadata: { 'Hive-Request-ID': 'r1' },
    });
  });

  test('a Slack attempt has no HTTP status', () => {
    expect(
      toDelivery({
        unix_timestamp: 1_762_000_000,
        event: 'metric_alert',
        ok: 1,
        status_code: 0,
        status_text: 'ok',
        duration_ms: 5,
        attempt: 1,
        metadata: {},
      }),
    ).toEqual(expect.objectContaining({ event: 'METRIC_ALERT', ok: true, statusCode: null }));
  });
});

describe('AlertChannelDeliveryReader', () => {
  test('getOverTime parses the buckets and their dates as UTC', async () => {
    const { reader } = createReader([
      { date: '2026-11-02 10:00:00', total: '3', failed: '1' },
      { date: '2026-11-02 11:00:00', total: '0', failed: '0' },
      { date: '2026-11-02 12:00:00', total: '2', failed: '2' },
    ]);

    await expect(
      reader.getOverTime({
        projectId: 'p1',
        channelId: 'c1',
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
        projectId: 'p1',
        channelId: 'c1',
        period: { from: new Date('2026-11-02T10:00:00Z'), to: new Date('2026-11-02T13:00:00Z') },
      }),
    ).resolves.toEqual({ total: 5, failed: 3 });
  });

  test('getLog returns the parsed attempts', async () => {
    const { reader } = createReader([
      {
        unix_timestamp: 1_762_000_000,
        event: 'channel_confirmation',
        ok: 1,
        status_code: 200,
        status_text: 'OK',
        duration_ms: 40,
        attempt: 1,
        metadata: { 'Hive-Event': 'channel_confirmation' },
      },
    ]);

    await expect(
      reader.getLog({
        projectId: 'p1',
        channelId: 'c1',
        period: { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-03T00:00:00Z') },
      }),
    ).resolves.toEqual([
      expect.objectContaining({ event: 'CHANNEL_CONFIRMATION', ok: true, statusCode: 200 }),
    ]);
  });
});
