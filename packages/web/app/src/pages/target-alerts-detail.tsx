import { useMemo, useState } from 'react';
import { subMinutes } from 'date-fns';
import { useQuery } from 'urql';
import { Select } from '@/components/base/floating/select/select';
import { PageLead } from '@/components/base/page-lead';
import { BackLink } from '@/components/navigation/back-link';
import { ResourceNotFoundComponent } from '@/components/resource-not-found';
import { AlertConditionsPanel } from '@/components/target/alerts/alert-conditions-panel';
import { AlertEventsTable } from '@/components/target/alerts/alert-events-table';
import { AlertMetricChart } from '@/components/target/alerts/alert-metric-chart';
import { AlertStateTransitionsBar } from '@/components/target/alerts/alert-state-transitions-bar';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { useNavigate } from '@tanstack/react-router';

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
          filters {
            operationHashes
            clientFilters {
              name
              versions
            }
            dateRange {
              from
              to
            }
            excludeOperations
            excludeClientFilters
          }
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
  const navigate = useNavigate();

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
    requestPolicy: 'cache-and-network',
  });

  const rule = result.data?.target?.metricAlertRule;

  // Spinner while loading (initial fetch, or revalidation after navigation
  // where urql briefly serves stale `metricAlertRule: null`). Only render
  // not-found once the network has confirmed it.
  if (result.fetching || result.stale || !result.data) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center py-28">
        <Spinner />
      </div>
    );
  }

  if (!rule) {
    return <ResourceNotFoundComponent title="Alert rule not found" />;
  }

  return (
    <div className="flex gap-8 pt-7">
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

        <PageLead description={buildDescription(rule)} title={rule.name} />

        <div className="flex">
          <Select
            options={VIEW_RANGE_OPTIONS}
            value={viewRangeMinutes}
            onValueChange={setViewRangeMinutes}
          />
        </div>

        <section className="space-y-2">
          <h2 className="text-neutral-12 m-0 mb-2 text-sm font-medium">Status transitions</h2>
          <AlertStateTransitionsBar
            stateLog={rule.stateLog}
            from={from}
            to={to}
            ruleCreatedAt={rule.createdAt}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-neutral-12 m-0 text-sm font-medium">
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
            type={rule.type}
            metric={rule.metric}
            timeWindowMinutes={parseInt(viewRangeMinutes, 10) || 60}
            thresholdValue={rule.thresholdValue}
            direction={rule.direction}
            thresholdType={rule.thresholdType}
          />
        </section>

        <AlertEventsTable
          stateLog={rule.stateLog}
          rule={rule}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      </div>

      <aside className="w-87 sticky top-6 shrink-0 self-start">
        <AlertConditionsPanel
          rule={rule}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          onRuleDeleted={() => {
            void navigate({
              to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/rules',
              params: { organizationSlug, projectSlug, targetSlug },
            });
          }}
        />
      </aside>
    </div>
  );
}
