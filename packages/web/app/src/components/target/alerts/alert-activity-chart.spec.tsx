// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { MetricAlertRuleSeverity, MetricAlertRuleState } from '@/gql/graphql';
import { render, screen } from '@testing-library/react';
import { AlertActivityChart } from './alert-activity-chart';

let measured: { width?: number; height?: number } = {};

vi.mock('@/components/theme/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: (props: { renderProp: (size: typeof measured) => ReactNode }) => (
    <>{props.renderProp(measured)}</>
  ),
}));

vi.mock('@/components/ui/primitives/chart/chart', () => ({
  Chart: () => <div data-testid="chart" />,
}));

function renderChart() {
  return render(
    <AlertActivityChart
      from="2026-09-27T00:00:00.000Z"
      to="2026-10-04T00:00:00.000Z"
      events={[
        {
          toState: MetricAlertRuleState.Firing,
          createdAt: '2026-10-01T12:00:00.000Z',
          rule: { severity: MetricAlertRuleSeverity.Warning },
        },
      ]}
    />,
  );
}

describe('AlertActivityChart', () => {
  it('renders nothing until AutoSizer has measured a width', () => {
    measured = {};
    renderChart();
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('renders the chart once a width is measured', () => {
    measured = { width: 1200, height: 200 };
    renderChart();
    expect(screen.getByTestId('chart')).toBeTruthy();
  });
});
