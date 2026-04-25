import { useMemo, useState } from 'react';
import { subMinutes } from 'date-fns';
import { useQuery } from 'urql';
import { Select } from '@/components/base/floating/select/select';
import { BackLink } from '@/components/navigation/back-link';
import { AlertConditionsPanel } from '@/components/target/alerts/alert-conditions-panel';
import { AlertEventsTable } from '@/components/target/alerts/alert-events-table';
import { AlertMetricChart } from '@/components/target/alerts/alert-metric-chart';
import { AlertStateTransitionsBar } from '@/components/target/alerts/alert-state-transitions-bar';
import { SubPageLayout } from '@/components/ui/page-content-layout';
import { graphql } from '@/gql';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';

const TargetAlertsDetailPage_Query = graphql(`
  query TargetAlertsDetailPage_Query(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $ruleId: ID!
    $from: DateTime!
    $to: DateTime!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      metricAlertRule(id: $ruleId) {
        id
        name
        type
        metric
        severity
        state
        enabled
        timeWindowMinutes
        thresholdType
        thresholdValue
        direction
        confirmationMinutes
        channels {
          id
          name
          type
        }
        savedFilter {
          id
          name
        }
        createdAt
        updatedAt
        createdBy {
          id
          displayName
        }
        updatedBy {
          id
          displayName
        }
        stateLog(from: $from, to: $to) {
          id
          fromState
          toState
          value
          previousValue
          thresholdValue
          createdAt
        }
      }
    }
  }
`);

const VIEW_RANGE_OPTIONS = [
  { value: '60', label: 'Last 1 hour' },
  { value: '360', label: 'Last 6 hours' },
  { value: '1440', label: 'Last 24 hours' },
  { value: '10080', label: 'Last 7 days' },
  { value: '43200', label: 'Last 30 days' },
] as const;

const METRIC_LABEL_BY_TYPE: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'error rate',
  [MetricAlertRuleType.Latency]: 'latency',
  [MetricAlertRuleType.Traffic]: 'total requests',
};

function ruleToMetricSelection(
  type: MetricAlertRuleType,
  metric: string | null | undefined,
): string {
  if (type === MetricAlertRuleType.Latency && metric) return `LATENCY:${metric}`;
  if (type === MetricAlertRuleType.ErrorRate) return 'ERROR_RATE';
  return 'TRAFFIC';
}

function formatWindowHuman(minutes: number): string {
  if (minutes >= 24 * 60) {
    const days = minutes / (24 * 60);
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

function buildDescription(rule: {
  type: MetricAlertRuleType;
  metric?: string | null;
  direction: MetricAlertRuleDirection;
  thresholdType: MetricAlertRuleThresholdType;
  thresholdValue: number;
  timeWindowMinutes: number;
}): string {
  const metricLabel =
    rule.type === MetricAlertRuleType.Latency && rule.metric
      ? `${rule.metric.toLowerCase()} latency`
      : METRIC_LABEL_BY_TYPE[rule.type];
  const dir = rule.direction === MetricAlertRuleDirection.Above ? 'above' : 'below';
  const isRelative = rule.thresholdType === MetricAlertRuleThresholdType.PercentageChange;
  const valueDisplay = isRelative ? `${rule.thresholdValue}% (relative)` : `${rule.thresholdValue}`;
  return `Fires when ${metricLabel} is ${dir} ${valueDisplay} over the ${formatWindowHuman(
    rule.timeWindowMinutes,
  )}.`;
}

export function TargetAlertsDetailPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  ruleId: string;
}) {
  const { organizationSlug, projectSlug, targetSlug, ruleId } = props;

  const [viewRangeMinutes, setViewRangeMinutes] = useState('60');

  const { from, to } = useMemo(() => {
    const now = new Date();
    const minutes = parseInt(viewRangeMinutes, 10) || 60;
    return {
      from: subMinutes(now, minutes).toISOString(),
      to: now.toISOString(),
    };
  }, [viewRangeMinutes]);

  const [result] = useQuery({
    query: TargetAlertsDetailPage_Query,
    variables: { organizationSlug, projectSlug, targetSlug, ruleId, from, to },
  });

  const rule = result.data?.target?.metricAlertRule;

  if (result.fetching && !rule) {
    return (
      <SubPageLayout>
        <p className="text-neutral-10 text-sm">Loading alert...</p>
      </SubPageLayout>
    );
  }

  if (!rule) {
    return (
      <SubPageLayout>
        <BackLink
          copy="Back to Alerts"
          link={{
            params: {
              organizationSlug,
              projectSlug,
              targetSlug,
            },
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
          }}
        />
        <p className="text-neutral-10 text-sm">Alert rule not found.</p>
      </SubPageLayout>
    );
  }

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1 space-y-6">
        <BackLink
          copy="Back to Alerts"
          link={{
            params: {
              organizationSlug,
              projectSlug,
              targetSlug,
            },
            to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
          }}
        />

        <div>
          <h1 className="text-neutral-12 text-2xl font-semibold">{rule.name}</h1>
          <p className="text-neutral-10 mt-1 text-sm">{buildDescription(rule)}</p>
        </div>

        <div className="flex">
          <Select
            options={[...VIEW_RANGE_OPTIONS]}
            value={viewRangeMinutes}
            onValueChange={setViewRangeMinutes}
          />
        </div>

        <section className="space-y-3">
          <h2 className="text-neutral-12 text-sm font-semibold">Status transitions</h2>
          <AlertStateTransitionsBar stateLog={rule.stateLog} from={from} to={to} />
        </section>

        <section className="space-y-3">
          <h2 className="text-neutral-12 text-sm font-semibold">
            {rule.type === MetricAlertRuleType.ErrorRate
              ? 'Error rate over time'
              : rule.type === MetricAlertRuleType.Latency
                ? 'Latency over time'
                : 'Traffic over time'}
          </h2>
          <AlertMetricChart
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            targetSlug={targetSlug}
            metricSelection={ruleToMetricSelection(rule.type, rule.metric)}
            timeWindowMinutes={parseInt(viewRangeMinutes, 10) || 60}
            thresholdValue={rule.thresholdValue}
            direction={rule.direction}
            thresholdType={rule.thresholdType}
          />
        </section>

        <AlertEventsTable stateLog={rule.stateLog} ruleType={rule.type} />
      </div>

      <aside className="sticky top-6 w-80 shrink-0 self-start">
        <AlertConditionsPanel
          rule={rule}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      </aside>
    </div>
  );
}
