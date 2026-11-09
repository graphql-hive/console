// @vitest-environment jsdom
import type { EChartsOption } from 'echarts';
import { render } from '@testing-library/react';
import { Sparkline } from './sparkline';
import { snapToBuckets, TimeSeriesChart } from './time-series-chart';

let option: EChartsOption | undefined;
let chartProps: { onEvents?: Record<string, (params: any) => void>; brushX?: boolean } = {};

vi.mock('@/components/theme/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('./chart', () => ({
  Chart: (props: { option: EChartsOption } & typeof chartProps) => {
    option = props.option;
    chartProps = props;
    return null;
  },
}));

const DATA: [string, number][] = [
  ['2026-09-28T00:00:00.000Z', 4],
  ['2026-09-29T00:00:00.000Z', 7],
];

function series() {
  return option!.series as Array<Record<string, any>>;
}

beforeEach(() => {
  option = undefined;
  chartProps = {};
});

describe('TimeSeriesChart', () => {
  it('draws bars, stacked when asked', () => {
    render(
      <TimeSeriesChart
        kind="bar"
        stacked
        series={[
          { name: 'Ok', data: DATA },
          { name: 'Error', data: DATA },
        ]}
      />,
    );
    expect(series().map(s => [s.type, s.stack])).toEqual([
      ['bar', 'total'],
      ['bar', 'total'],
    ]);
  });

  it('fills areas with a gradient and leaves lines unfilled', () => {
    const { rerender } = render(
      <TimeSeriesChart kind="area" series={[{ name: 'Requests', data: DATA }]} />,
    );
    expect(series()[0].areaStyle.color.type).toBe('linear');

    rerender(<TimeSeriesChart kind="line" series={[{ name: 'p75', data: DATA }]} />);
    expect(series()[0].areaStyle).toBeUndefined();
  });

  it('hides the legend unless asked, and reserves its row under the chart', () => {
    const { rerender } = render(
      <TimeSeriesChart kind="line" series={[{ name: 'p75', data: DATA }]} />,
    );
    expect(option!.legend).toEqual({ show: false });

    rerender(<TimeSeriesChart kind="line" legend series={[{ name: 'p75', data: DATA }]} />);
    expect(option!.legend).toMatchObject({ bottom: 0 });
    expect(option!.grid).toMatchObject({ bottom: 32 });
  });
});

describe('TimeSeriesChart range select', () => {
  const HOUR = 60 * 60 * 1000;
  const T0 = Date.UTC(2026, 8, 28);
  const HOURS: [string, number][] = [0, 1, 2, 3].map(i => [
    new Date(T0 + i * HOUR).toISOString(),
    1,
  ]);

  it('leaves the brush off without a handler', () => {
    render(<TimeSeriesChart kind="bar" series={[{ name: 'Ok', data: HOURS }]} />);
    expect(option!.brush).toBeUndefined();
    expect(chartProps.brushX).toBe(false);
    expect(chartProps.onEvents).toBeUndefined();
  });

  it('reports a drag as the whole buckets it touches', () => {
    const onRangeSelect = vi.fn();
    render(
      <TimeSeriesChart
        kind="bar"
        onRangeSelect={onRangeSelect}
        series={[{ name: 'Ok', data: HOURS }]}
      />,
    );
    expect(option!.brush).toMatchObject({ xAxisIndex: 0, brushType: 'lineX' });
    expect(option!.toolbox).toEqual({ show: false });
    expect(chartProps.brushX).toBe(true);

    chartProps.onEvents!.brushEnd({
      areas: [{ coordRange: [T0 + 0.8 * HOUR, T0 + 1.6 * HOUR] }],
    });
    expect(onRangeSelect).toHaveBeenCalledWith({
      from: new Date(T0 + 1 * HOUR),
      to: new Date(T0 + 3 * HOUR),
    });
  });

  it('ignores a click and a drag that ends with no area', () => {
    const onRangeSelect = vi.fn();
    render(
      <TimeSeriesChart
        kind="bar"
        onRangeSelect={onRangeSelect}
        series={[{ name: 'Ok', data: HOURS }]}
      />,
    );
    chartProps.onEvents!.brushEnd({ areas: [{ coordRange: [T0, T0] }] });
    chartProps.onEvents!.brushEnd({ areas: [] });
    expect(onRangeSelect).not.toHaveBeenCalled();
  });

  it('snaps nothing when the drag misses every bucket', () => {
    const times = HOURS.map(([date]) => new Date(date).getTime());
    expect(snapToBuckets([T0 + 5 * HOUR, T0 + 6 * HOUR], times)).toBeNull();
    expect(snapToBuckets([T0, T0 + HOUR], [])).toBeNull();
  });
});

describe('Sparkline', () => {
  it('scales to the shared max and passes the animation flag through', () => {
    render(<Sparkline name="Requests" data={DATA} max={100} animation={false} />);
    expect(option!.yAxis).toMatchObject({ max: 100, show: false });
    expect(option!.animation).toBe(false);
  });
});
