import { applyThresholdSign, thresholdUnit } from './alert-threshold';

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
