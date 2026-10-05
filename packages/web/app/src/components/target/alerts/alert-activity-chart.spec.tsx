// @vitest-environment jsdom
import { MetricAlertRuleSeverity, MetricAlertRuleState } from '@/gql/graphql';
import { render, screen } from '@testing-library/react';
import { AlertActivityChart } from './alert-activity-chart';

vi.mock('@/components/theme/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('react-virtualized-auto-sizer', () => import('@/lib/testing/mocks/auto-sizer'));

vi.mock('@/components/ui/primitives/chart/chart', () => ({
  Chart: () => <div data-testid="chart" />,
}));

describe('AlertActivityChart', () => {
  it('gives the chart box the width AutoSizer measured', () => {
    render(
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
    expect(screen.getByTestId('chart').parentElement?.style.width).toBe('1200px');
  });
});
