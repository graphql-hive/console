import { useMemo, useState } from 'react';
import { subMinutes } from 'date-fns';
import { useQuery } from 'urql';
import { Select } from '@/components/base/floating/select/select';
import { PageLead } from '@/components/base/page-lead';
import { BackLink } from '@/components/navigation/back-link';
import { ResourceNotFoundComponent } from '@/components/resource-not-found';
import { AlertConditionsPanel } from '@/components/target/alerts/alert-conditions-panel';
import {
  AlertEventsTable,
  type AlertEventsTableRule,
} from '@/components/target/alerts/alert-events-table';
import { AlertMetricChart } from '@/components/target/alerts/alert-metric-chart';
import { ALERTS_POLL_INTERVAL_MS } from '@/components/target/alerts/alert-polling';
import { AlertStateTransitionsBar } from '@/components/target/alerts/alert-state-transitions-bar';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { resolveRangeAndResolution } from '@/lib/hooks/use-date-range-controller';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useRollingNow } from '@/lib/hooks/use-rolling-now';
import { useNavigate } from '@tanstack/react-router';

// Static rule configuration. Fetched once with no polling — the Modify-alert
// sheet (and everything else in the page chrome) lives under this query, so it
// is never torn down by a background refetch. The live, time-windowed
// `stateLog` is fetched separately by `RuleStateLogSection` below.
const TargetAlertsDetailPage_RuleConfigQuery = graphql(`
  query TargetAlertsDetailPage_RuleConfigQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $ruleId: ID!
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
      }
    }
  }
`);

const TargetAlertsDetailPage_StateLogQuery = graphql(`
  query TargetAlertsDetailPage_StateLogQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $ruleId: ID!
    $from: DateTime!
    $to: DateTime!
    $resolution: Int!
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
        stateAt(timestamp: $from)
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
      operationsStats(period: { from: $from, to: $to }) {
        ...AlertMetricChart_OperationsStatsFragment
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
  // Fixed-value thresholds carry the metric's unit: ms for latency (rendered as
  // "4.00s" via formatDuration), percent for error rate, bare count for traffic.
  const valueDisplay = isRelative
    ? `${rule.thresholdValue}% (relative)`
    : rule.type === MetricAlertRuleType.Latency
      ? formatDuration(rule.thresholdValue, true)
      : rule.type === MetricAlertRuleType.ErrorRate
        ? `${rule.thresholdValue}%`
        : `${rule.thresholdValue}`;
  return `Fires when ${metricLabel} is ${dir} ${valueDisplay} over the last ${formatWindowHuman(
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

  const [result] = useQuery({
    query: TargetAlertsDetailPage_RuleConfigQuery,
    variables: { organizationSlug, projectSlug, targetSlug, ruleId },
    requestPolicy: 'cache-and-network',
  });

  const rule = result.data?.target?.metricAlertRule;

  // Only surface the error when there's nothing cached to fall back on; if a
  // cache-and-network refetch errors but we still hold data, we keep showing it.
  if (result.error && !result.data) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center py-28">
        <div className="text-sm text-red-500">
          Failed to load alert rule: {result.error.message}
        </div>
      </div>
    );
  }

  if (!rule && (result.fetching || result.stale)) {
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

        <RuleStateLogSection
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          ruleId={rule.id}
          viewRangeMinutes={viewRangeMinutes}
          rule={rule}
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

function RuleStateLogSection(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  ruleId: string;
  viewRangeMinutes: string;
  rule: AlertEventsTableRule & {
    createdAt: string;
    metric?: MetricAlertRuleMetric | null;
    severity: MetricAlertRuleSeverity;
  };
}) {
  const { organizationSlug, projectSlug, targetSlug, ruleId, viewRangeMinutes, rule } = props;

  const now = useRollingNow(ALERTS_POLL_INTERVAL_MS);
  const { from, to, resolution } = useMemo(() => {
    const minutes = parseInt(viewRangeMinutes, 10) || 60;
    const resolved = resolveRangeAndResolution({ from: subMinutes(now, minutes), to: now });
    return {
      from: resolved.range.from.toISOString(),
      to: resolved.range.to.toISOString(),
      resolution: resolved.resolution,
    };
  }, [now, viewRangeMinutes]);

  const [result] = useQuery({
    query: TargetAlertsDetailPage_StateLogQuery,
    variables: { organizationSlug, projectSlug, targetSlug, ruleId, from, to, resolution },
    requestPolicy: 'cache-and-network',
  });

  const data = useKeepPreviousData(result.data, result.fetching || result.stale);
  const stateLog = data?.target?.metricAlertRule?.stateLog ?? [];
  const stateAtWindowStart = data?.target?.metricAlertRule?.stateAt;
  const operationsStats = data?.target?.operationsStats ?? null;
  const hasNoData = !data;
  const stateLogStatus =
    result.error && hasNoData ? (
      <div className="py-4 text-sm text-red-500">
        Failed to load status transitions: {result.error.message}
      </div>
    ) : result.fetching && hasNoData ? (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    ) : null;

  return (
    <>
      <section className="space-y-2">
        <h2 className="text-neutral-12 m-0 mb-2 text-sm font-medium">Status transitions</h2>
        {stateLogStatus ?? (
          <AlertStateTransitionsBar
            stateLog={stateLog}
            from={from}
            to={to}
            initialState={stateAtWindowStart ?? undefined}
            ruleCreatedAt={rule.createdAt}
          />
        )}
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
          stats={operationsStats}
          loading={result.fetching && hasNoData}
          type={rule.type}
          metric={rule.metric}
          severity={rule.severity}
          thresholdValue={rule.thresholdValue}
          direction={rule.direction}
          thresholdType={rule.thresholdType}
        />
      </section>

      {stateLogStatus ? null : (
        <AlertEventsTable
          stateLog={stateLog}
          rule={rule}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      )}
    </>
  );
}
