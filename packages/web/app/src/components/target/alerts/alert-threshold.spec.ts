import { applyThresholdSign, thresholdUnit, windowAggregates } from './alert-threshold';

describe('thresholdUnit', () => {
  it('is always % for a percentage change, regardless of metric', () => {
    expect(thresholdUnit('LATENCY', 'PERCENTAGE_CHANGE')).toBe('%');
    expect(thresholdUnit('TRAFFIC', 'PERCENTAGE_CHANGE')).toBe('%');
    expect(thresholdUnit('ERROR_RATE', 'PERCENTAGE_CHANGE')).toBe('%');
  });

  it('uses the metric unit for a fixed value', () => {
    expect(thresholdUnit('LATENCY', 'FIXED_VALUE')).toBe('ms');
    expect(thresholdUnit('ERROR_RATE', 'FIXED_VALUE')).toBe('%');
    expect(thresholdUnit('TRAFFIC', 'FIXED_VALUE')).toBe('requests');
  });
});

describe('applyThresholdSign', () => {
  it('negates only a percentage-change decrease (Below)', () => {
    expect(applyThresholdSign(50, 'PERCENTAGE_CHANGE', 'BELOW')).toBe(-50);
  });

  it('leaves a percentage-change increase (Above) positive', () => {
    expect(applyThresholdSign(50, 'PERCENTAGE_CHANGE', 'ABOVE')).toBe(50);
  });

  it('never negates a fixed value, even Below', () => {
    expect(applyThresholdSign(100, 'FIXED_VALUE', 'BELOW')).toBe(100);
    expect(applyThresholdSign(100, 'FIXED_VALUE', 'ABOVE')).toBe(100);
  });

  it('round-trips magnitude -> signed -> magnitude via Math.abs', () => {
    const magnitude = 75;
    const signed = applyThresholdSign(magnitude, 'PERCENTAGE_CHANGE', 'BELOW');
    expect(Math.abs(signed)).toBe(magnitude);
  });
});

describe('windowAggregates', () => {
  // Boundary at t=100; buckets at 100+ are "current", before are "previous".
  const boundaryMs = new Date('2026-06-15T01:00:00.000Z').getTime();
  const prev = '2026-06-15T00:30:00.000Z'; // before boundary
  const curr = '2026-06-15T01:30:00.000Z'; // at/after boundary

  const requests = [
    { date: prev, value: 100 },
    { date: prev, value: 100 },
    { date: curr, value: 200 },
    { date: curr, value: 300 },
  ];
  const failures = [
    { date: prev, value: 10 },
    { date: prev, value: 30 },
    { date: curr, value: 5 },
    { date: curr, value: 15 },
  ];
  const noDuration: never[] = [];

  it('sums requests per window for TRAFFIC', () => {
    const { current, previous } = windowAggregates(
      'TRAFFIC',
      null,
      requests,
      failures,
      noDuration,
      boundaryMs,
    );
    expect(previous).toBe(200); // 100 + 100
    expect(current).toBe(500); // 200 + 300
  });

  it('uses ratio-of-sums (not mean of per-bucket rates) for ERROR_RATE', () => {
    const { current, previous } = windowAggregates(
      'ERROR_RATE',
      null,
      requests,
      failures,
      noDuration,
      boundaryMs,
    );
    // previous: (10 + 30) / (100 + 100) = 20%, NOT the mean of 10% and 30%.
    expect(previous).toBe(20);
    // current: (5 + 15) / (200 + 300) = 4%
    expect(current).toBe(4);
  });

  it('averages bucket percentiles per window for LATENCY (approximation)', () => {
    const durations = [
      { date: prev, duration: { avg: 0, p75: 0, p90: 0, p95: 100, p99: 0 } },
      { date: prev, duration: { avg: 0, p75: 0, p90: 0, p95: 300, p99: 0 } },
      { date: curr, duration: { avg: 0, p75: 0, p90: 0, p95: 800, p99: 0 } },
    ];
    const { current, previous } = windowAggregates('LATENCY', 'p95', [], [], durations, boundaryMs);
    expect(previous).toBe(200); // mean(100, 300)
    expect(current).toBe(800); // mean(800)
  });
});
