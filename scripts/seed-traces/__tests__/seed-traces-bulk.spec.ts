import { execSync } from 'child_process';
import { humanId } from 'human-id';
import { describe, expect, test } from 'vitest';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://test:test@localhost:8123';

async function clickHouseQuery<T>(query: string): Promise<{ data: T[]; rows: number }> {
  const url = new URL(CLICKHOUSE_URL);
  const endpoint = `${url.protocol}//${url.host}/?default_format=JSON`;
  const credentials = Buffer.from(`${url.username}:${url.password}`).toString('base64');

  const response = await fetch(endpoint, {
    method: 'POST',
    body: query,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
  });

  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`ClickHouse query failed with status ${response.status}: ${body}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    return { data: [], rows: 0 };
  }
  return JSON.parse(text);
}

function generateUniqueSlug(): string {
  const unique = humanId({ separator: '-', capitalize: false });
  return `test-org/test-project/${unique}`;
}

describe('seed-traces-bulk', () => {
  test('seeds traces into ClickHouse', { timeout: 30_000 }, async () => {
    const targetSlug = generateUniqueSlug();

    // Run the seed script with minimal traces (default is 6)
    execSync(`pnpm seed:traces "${targetSlug}"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
      },
    });

    // Query ClickHouse to verify traces were created
    const result = await clickHouseQuery<{ count: string }>(`
      SELECT count() as count
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);

    expect(result.rows).toBe(1);
    const spanCount = parseInt(result.data[0].count, 10);
    expect(spanCount).toBeGreaterThan(0);

    // Verify we have root spans with expected attributes
    const rootSpans = await clickHouseQuery<{
      TraceId: string;
      SpanAttributes: Record<string, string>;
    }>(`
      SELECT TraceId, SpanAttributes
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
        AND SpanAttributes['hive.graphql'] = 'true'
    `);

    expect(rootSpans.rows).toBe(6); // 6 sample traces

    // Verify root spans have expected attributes
    for (const span of rootSpans.data) {
      expect(span.SpanAttributes['hive.target_id']).toBe(targetSlug);
      expect(span.SpanAttributes['hive.graphql']).toBe('true');
      expect(span.SpanAttributes['hive.client.name']).toBeDefined();
      expect(span.SpanAttributes['hive.client.version']).toBeDefined();
      expect(span.SpanAttributes['hive.graphql.operation.hash']).toBeDefined();
      expect(span.SpanAttributes['hive.graphql.error.count']).toBeDefined();
    }

    // Cleanup: delete test data
    await clickHouseQuery(`
      ALTER TABLE otel_traces DELETE
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);
  });

  test('seeds specified number of traces with duplication', { timeout: 60_000 }, async () => {
    const targetSlug = generateUniqueSlug();

    // Run with --count=12 (will create 12 traces via duplication)
    execSync(`pnpm seed:traces "${targetSlug}" --count=12`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
      },
    });

    // Wait for async inserts to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query to count unique traces
    const result = await clickHouseQuery<{ count: string }>(`
      SELECT count(DISTINCT TraceId) as count
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);

    const traceCount = parseInt(result.data[0].count, 10);
    expect(traceCount).toBe(12); // 6 samples * 2 duplicates = 12

    // Cleanup
    await clickHouseQuery(`
      ALTER TABLE otel_traces DELETE
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);
  });

  test('spreads traces across the date range with jitter and duplicates correctly', { timeout: 120_000 }, async () => {
    const targetSlug = generateUniqueSlug();
    const days = 7;
    const now = Date.now();
    const rangeStart = now - days * 24 * 60 * 60 * 1000;

    // Run with --count=100 --days=7 (creates 102 traces: 6 samples * 17 duplicates)
    execSync(`pnpm seed:traces "${targetSlug}" --count=100 --days=${days}`, {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: {
        ...process.env,
      },
    });

    // Wait for async inserts to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query timestamps of root spans (one per trace)
    const timestamps = await clickHouseQuery<{ ts: string }>(`
      SELECT min(Timestamp) as ts
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
      GROUP BY TraceId
      ORDER BY ts
    `);

    expect(timestamps.rows).toBe(102); // ceil(100/6) * 6 = 102

    const times = timestamps.data.map(row => new Date(row.ts + 'Z').getTime());

    // Verify all timestamps are within the expected range (with some buffer for jitter)
    const bufferMs = 60 * 60 * 1000; // 1 hour buffer
    for (const time of times) {
      expect(time).toBeGreaterThan(rangeStart - bufferMs);
      expect(time).toBeLessThanOrEqual(now + bufferMs);
    }

    // Verify timestamps are spread out (not all clustered together)
    // Calculate the time span covered by the traces
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const actualSpan = maxTime - minTime;
    const expectedMinSpan = (days * 24 * 60 * 60 * 1000) * 0.5; // At least 50% of the range

    expect(actualSpan).toBeGreaterThan(expectedMinSpan);

    // Verify traces are not all at exact intervals (jitter is working)
    // Calculate intervals between consecutive timestamps
    const sortedTimes = [...times].sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sortedTimes.length; i++) {
      intervals.push(sortedTimes[i] - sortedTimes[i - 1]);
    }

    // Check that intervals vary (not all the same, indicating jitter)
    const uniqueIntervals = new Set(intervals.map(i => Math.round(i / 60000))); // Round to minutes
    expect(uniqueIntervals.size).toBeGreaterThan(1);

    // Verify duplication: 18 traces should have 18 unique TraceIds
    const traceIds = await clickHouseQuery<{ TraceId: string }>(`
      SELECT DISTINCT TraceId
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);
    expect(traceIds.rows).toBe(102);

    // Verify duplication by checking span count per trace is consistent
    // Each duplicated trace should have the same number of spans as its original
    const spansPerTrace = await clickHouseQuery<{ TraceId: string; spanCount: string }>(`
      SELECT TraceId, count() as spanCount
      FROM otel_traces
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
      GROUP BY TraceId
    `);

    expect(spansPerTrace.rows).toBe(102);

    // Group by span count to verify duplicates have same structure
    const spanCountGroups = new Map<number, number>();
    for (const row of spansPerTrace.data) {
      const count = parseInt(row.spanCount, 10);
      spanCountGroups.set(count, (spanCountGroups.get(count) || 0) + 1);
    }

    // Each span count should appear in multiples of 17 (since we have 17 copies of each sample)
    for (const [, traceCount] of spanCountGroups) {
      expect(traceCount % 17).toBe(0);
    }

    // Cleanup
    await clickHouseQuery(`
      ALTER TABLE otel_traces DELETE
      WHERE SpanAttributes['hive.target_id'] = '${targetSlug}'
    `);
  });
});
