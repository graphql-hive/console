// @vitest-environment jsdom
import { MetricAlertRuleSeverity, MetricAlertRuleState } from '@/gql/graphql';
import { render, screen } from '@testing-library/react';
import { AlertActivityChart } from './alert-activity-chart';

vi.mock('@/components/theme/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

vi.mock('@/components/ui/primitives/chart/chart', () => ({
  Chart: () => <div data-testid="chart" />,
}));

const RANGE = { from: '2026-09-27T00:00:00.000Z', to: '2026-10-04T00:00:00.000Z' };

function event(toState: MetricAlertRuleState) {
  return {
    toState,
    createdAt: '2026-10-01T12:00:00.000Z',
    rule: { severity: MetricAlertRuleSeverity.Warning },
  };
}

describe('AlertActivityChart', () => {
  it('draws the chart when a rule fired in the range', () => {
    render(<AlertActivityChart {...RANGE} events={[event(MetricAlertRuleState.Firing)]} />);
    expect(screen.getByTestId('chart')).toBeTruthy();
  });

  it('shows the empty state when nothing fired, even if states changed', () => {
    render(<AlertActivityChart {...RANGE} events={[event(MetricAlertRuleState.Normal)]} />);
    expect(screen.queryByTestId('chart')).toBeNull();
    expect(screen.getByText('No alerts fired in the selected time range.')).toBeTruthy();
  });
});
