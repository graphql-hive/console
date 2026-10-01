// @vitest-environment jsdom
import type { EChartsOption } from 'echarts';
import { render } from '@testing-library/react';
import { Sparkline } from './sparkline';
import { TimeSeriesChart } from './time-series-chart';

let option: EChartsOption | undefined;

vi.mock('@/components/theme/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('./chart', () => ({
  Chart: (props: { option: EChartsOption }) => {
    option = props.option;
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

describe('Sparkline', () => {
  it('scales to the shared max and passes the animation flag through', () => {
    render(<Sparkline name="Requests" data={DATA} max={100} animation={false} />);
    expect(option!.yAxis).toMatchObject({ max: 100, show: false });
    expect(option!.animation).toBe(false);
  });
});
