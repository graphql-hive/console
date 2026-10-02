import { printWithValues } from '@hive/clickhouse';
import { OperationsReader } from '../providers/operations-reader';

const logger = { debug: vi.fn() };

const MS_PER_DAY = 86_400_000;
// 365 days in the past
const operationsV01RollupsStart = new Date(
  Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / MS_PER_DAY) * MS_PER_DAY,
);

function createReader() {
  const query = vi.fn().mockResolvedValue({
    data: [{ total: 10, totalOk: 8 }],
    rows: 1,
  });

  return {
    query,
    reader: new OperationsReader(
      { query, translateWindow: () => '1 MINUTE' } as any,
      logger as any,
      { operationsV01RollupsStart } as any,
    ),
  };
}

function createLegacyReader() {
  const query = vi.fn().mockResolvedValue({
    data: [{ total: 10, totalOk: 8 }],
    rows: 1,
  });

  return {
    query,
    reader: new OperationsReader(
      { query, translateWindow: () => '1 MINUTE' } as any,
      logger as any,
    ),
  };
}

function period(from: Date, duration = 30 * 60 * 1000) {
  return {
    from,
    to: new Date(from.getTime() + duration),
  };
}

const now = new Date();
const today = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);
const periods = {
  minutely: period(new Date(Math.floor((now.getTime() - 60 * 60 * 1000) / 60_000) * 60_000)),
  hourly: period(
    new Date(Math.floor((now.getTime() - 3 * 24 * 60 * 60 * 1000) / 3_600_000) * 3_600_000),
  ),
  daily: period(new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000)),
};

const timelinePeriods = {
  minutely: { period: periods.minutely, resolution: 30 },
  hourly: {
    period: period(periods.hourly.from, 30 * 60 * 60 * 1000),
    resolution: 30,
  },
};

describe('OperationsReader.countRequests v01 rollups', () => {
  test.each(
    // prettier-ignore
    [
      ['minutely', periods.minutely, 'without filters', {}, '_by_timestamp'],
      ['minutely', periods.minutely, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['minutely', periods.minutely, 'with operation filters', { operations: ['hash'] }, ''],
      ['hourly', periods.hourly, 'without filters', {}, '_by_timestamp'],
      ['hourly', periods.hourly, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['hourly', periods.hourly, 'with operation filters', { operations: ['hash'] }, ''],
      ['daily', periods.daily, 'without filters', {}, '_by_timestamp'],
      ['daily', periods.daily, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['daily', periods.daily, 'with operation filters', { operations: ['hash'] }, ''],
      ['daily', periods.daily, 'with operation and client filters', { operations: ['hash'], clients: ['web'] }, ''],
    ] as const,
  )('uses the %s %s rollup %s', async (granularity, range, _filterDescription, filters, suffix) => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: range,
      ...filters,
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      `FROM operations_v01_${granularity}${suffix} `,
    );
  });

  test('uses the client rollup for client-version-filtered requests', async () => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: periods.minutely,
      clientVersionFilters: [{ clientName: 'web', versions: ['1'] }],
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      'FROM operations_v01_minutely_by_client',
    );
  });

  test('uses the client rollup for excluded client versions after the cutoff', async () => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: periods.minutely,
      clientVersionFilters: [{ clientName: 'web', versions: ['1'] }],
      excludeClientVersionFilters: true,
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      'FROM operations_v01_minutely_by_client',
    );
  });

  test('uses the detailed rollup for schema-coordinate-filtered requests after the cutoff', async () => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: periods.minutely,
      schemaCoordinate: 'Query.product',
    });

    const rendered = printWithValues(query.mock.calls[0][0].query);
    expect(rendered).toContain('FROM operations_v01_minutely ');
    expect(rendered).not.toContain('FROM operations_v01_minutely_by_');
  });

  test('prefers the detailed rollup when operation and client filters are combined', async () => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: periods.minutely,
      operations: ['hash'],
      clients: ['web'],
    });

    const rendered = printWithValues(query.mock.calls[0][0].query);
    expect(rendered).toContain('FROM operations_v01_minutely ');
    expect(rendered).not.toContain('FROM operations_v01_minutely_by_client');
  });

  test('uses the legacy rollup when the period starts before the cutoff', async () => {
    const { query, reader } = createReader();

    await reader.countRequests({
      target: 't1',
      period: period(new Date(operationsV01RollupsStart.getTime() - 1)),
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain('FROM operations_daily');
  });

  test('uses the legacy rollup when no cutoff is configured', async () => {
    const { query, reader } = createLegacyReader();

    await reader.countRequests({
      target: 't1',
      period: periods.minutely,
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain('FROM operations_minutely');
  });
});

describe('OperationsReader v01 rollups', () => {
  test('uses the timestamp rollup for countOperationsWithoutDetails', async () => {
    const { query, reader } = createReader();

    await reader.countOperationsWithoutDetails({
      target: 't1',
      period: periods.minutely,
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      'FROM operations_v01_minutely_by_timestamp',
    );
  });

  test('uses the detailed rollup for countUniqueDocuments', async () => {
    const { query, reader } = createReader();

    await reader.countUniqueDocuments({
      target: 't1',
      period: periods.minutely,
    });

    expect(printWithValues(query.mock.calls[0][0].query)).toContain('FROM operations_v01_minutely');
  });

  test('uses the client rollup and t-digest merge for filtered duration metrics', async () => {
    const { query, reader } = createReader();
    query.mockResolvedValue({
      data: [{ average: 100, percentiles: [75, 90, 95, 99] }],
      rows: 1,
    });

    await reader.generalDurationPercentiles({
      target: 't1',
      period: periods.minutely,
      clients: ['web'],
    });

    const rendered = printWithValues(query.mock.calls[0][0].query);
    expect(rendered).toContain('FROM operations_v01_minutely_by_client');
    expect(rendered).toContain('quantilesTDigestMerge');
  });

  test('keeps legacy duration merge before the cutoff', async () => {
    const { query, reader } = createReader();
    query.mockResolvedValue({
      data: [{ average: 100, percentiles: [75, 90, 95, 99] }],
      rows: 1,
    });

    await reader.generalDurationPercentiles({
      target: 't1',
      period: period(new Date(operationsV01RollupsStart.getTime() - 1)),
    });

    const rendered = printWithValues(query.mock.calls[0][0].query);
    expect(rendered).toContain('FROM operations_daily');
    expect(rendered).toContain('quantilesMerge');
    expect(rendered).not.toContain('quantilesTDigestMerge');
  });

  test('uses the detailed t-digest rollup for durationMetrics', async () => {
    const { query, reader } = createReader();
    query.mockResolvedValue({ data: [], rows: 0 });

    await reader.durationMetrics({
      target: 't1',
      period: periods.minutely,
    });

    const rendered = printWithValues(query.mock.calls[0][0].query);
    expect(rendered).toContain('FROM operations_v01_minutely');
    expect(rendered).toContain('quantilesTDigestMerge');
  });

  test.each(
    // prettier-ignore
    [
      ['requestsOverTime', 'minutely', timelinePeriods.minutely, 'without filters', {}, '_by_timestamp'],
      ['requestsOverTime', 'minutely', timelinePeriods.minutely, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['requestsOverTime', 'minutely', timelinePeriods.minutely, 'with operation filters', { operations: ['hash'] }, ''],
      ['requestsOverTime', 'hourly', timelinePeriods.hourly, 'without filters', {}, '_by_timestamp'],
      ['requestsOverTime', 'hourly', timelinePeriods.hourly, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['requestsOverTime', 'hourly', timelinePeriods.hourly, 'with operation filters', { operations: ['hash'] }, ''],
      ['failuresOverTime', 'minutely', timelinePeriods.minutely, 'without filters', {}, '_by_timestamp'],
      ['failuresOverTime', 'minutely', timelinePeriods.minutely, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['failuresOverTime', 'minutely', timelinePeriods.minutely, 'with operation filters', { operations: ['hash'] }, ''],
      ['durationOverTime', 'minutely', timelinePeriods.minutely, 'without filters', {}, '_by_timestamp'],
      ['durationOverTime', 'minutely', timelinePeriods.minutely, 'with client filters', { clients: ['web'] }, '_by_client'],
      ['durationOverTime', 'minutely', timelinePeriods.minutely, 'with operation filters', { operations: ['hash'] }, ''],
      ['durationOverTime', 'minutely', timelinePeriods.minutely, 'with operation and client filters', { operations: ['hash'], clients: ['web'] }, ''],
    ] as const,
  )(
    '%s uses the %s %s rollup %s',
    async (method, granularity, args, _filterDescription, filters, suffix) => {
      const { query, reader } = createReader();
      query.mockResolvedValue({ data: [], rows: 0 });

      await reader[method]({
        target: 't1',
        ...args,
        ...filters,
      });

      expect(printWithValues(query.mock.calls[0][0].query)).toContain(
        `FROM operations_v01_${granularity}${suffix}`,
      );
    },
  );

  test.each([
    ['requestsOverTimeOfTargets', 'minutely', timelinePeriods.minutely],
    ['requestsOverTimeOfTargets', 'hourly', timelinePeriods.hourly],
  ] as const)('%s uses the %s timestamp rollup', async (method, granularity, args) => {
    const { query, reader } = createReader();
    query.mockResolvedValue({ data: [], rows: 0 });

    await reader[method]([{ targets: ['t1'], ...args }]);

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      `FROM operations_v01_${granularity}_by_timestamp`,
    );
  });

  test.each([
    ['adminOperationsOverTime', 'minutely', timelinePeriods.minutely],
    ['adminOperationsOverTime', 'hourly', timelinePeriods.hourly],
  ] as const)('%s uses the %s timestamp rollup', async (method, granularity, args) => {
    const { query, reader } = createReader();
    query.mockResolvedValue({ data: [], rows: 0 });

    await reader[method](args);

    expect(printWithValues(query.mock.calls[0][0].query)).toContain(
      `FROM operations_v01_${granularity}_by_timestamp`,
    );
  });
});
