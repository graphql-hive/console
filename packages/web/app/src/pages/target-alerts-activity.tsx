import { useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { Filters } from '@/components/base/floating/filter-menu/filters';
import { PageLead } from '@/components/base/page-lead';
import { AlertActivityChart } from '@/components/target/alerts/alert-activity-chart';
import { useActivityFilterDimensions } from '@/components/target/alerts/alert-activity-filters';
import {
  AlertActivityTable,
  type ActivityEventRow,
} from '@/components/target/alerts/alert-activity-table';
import { DateRangePicker, type Preset } from '@/components/ui/date-range-picker';
import { graphql } from '@/gql';
import { MetricAlertRuleSeverity, MetricAlertRuleType } from '@/gql/graphql';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { useTickCounter } from '@/lib/hooks/use-tick-counter';
import { useNavigate, useSearch } from '@tanstack/react-router';

const TargetAlertsActivityPage_RetentionQuery = graphql(`
  query TargetAlertsActivityPage_RetentionQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
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
      metricAlertStateLogRetentionDays
    }
  }
`);

const TargetAlertsActivityPage_Query = graphql(`
  query TargetAlertsActivityPage_Query(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
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
      metricAlertRuleStateLog(from: $from, to: $to) {
        id
        fromState
        toState
        value
        previousValue
        thresholdValue
        createdAt
        rule {
          id
          name
          type
          metric
          severity
          direction
          thresholdType
          thresholdValue
          timeWindowMinutes
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
          createdBy {
            id
            displayName
          }
        }
      }
    }
  }
`);

const presetLast1Hour: Preset = {
  name: 'last1h',
  label: 'Last 1 hour',
  range: { from: 'now-1h', to: 'now' },
};

const ACTIVITY_ROUTE = '/authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/activity';

export function TargetAlertsActivityPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  // Mirror the insights pattern: parent fetches the plan-gated retention so
  // the picker's earliest-selectable date is correct on first render. The
  // inner component owns the date-range controller, which would otherwise
  // create a circular read between retention and the main query.
  const [retentionResult] = useQuery({
    query: TargetAlertsActivityPage_RetentionQuery,
    variables: { organizationSlug, projectSlug, targetSlug },
  });
  const retentionInDays = retentionResult.data?.target?.metricAlertStateLogRetentionDays;

  if (retentionInDays === undefined) {
    return null;
  }

  return (
    <ActivityView
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      targetSlug={targetSlug}
      retentionInDays={retentionInDays}
    />
  );
}

function ActivityView(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  retentionInDays: number;
}) {
  const { organizationSlug, projectSlug, targetSlug, retentionInDays } = props;
  const search = useSearch({ from: ACTIVITY_ROUTE });
  const navigate = useNavigate();

  // Populate URL with the default range on first load so refresh and shared
  // links stay in sync. Skipped when from/to are already present.
  useEffect(() => {
    if (search.from === undefined && search.to === undefined) {
      void navigate({
        search: prev => ({
          ...prev,
          from: presetLast1Hour.range.from,
          to: presetLast1Hour.range.to,
        }),
        replace: true,
      });
    }
  }, []);

  const dateRangeController = useDateRangeController({
    dataRetentionInDays: retentionInDays,
    defaultPreset: presetLast1Hour,
  });

  // Advance the picker's resolved range every 15s so the queried window's
  // `to` moves forward with wall-clock time and new state-log entries land
  // in the response. urql sees the changed variables and refires.
  const tick = useTickCounter(15_000);
  useEffect(() => {
    dateRangeController.refreshResolvedRange();
  }, [tick]);

  const [result] = useQuery({
    query: TargetAlertsActivityPage_Query,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      from: dateRangeController.resolvedRange.from,
      to: dateRangeController.resolvedRange.to,
    },
  });

  // Drop entries whose rule was deleted between fetching the state-log and
  // resolving each entry's rule field. Rare in practice (the cascade on
  // metric_alert_state_log normally removes the entry alongside the rule)
  // but a concurrent delete can leave the response holding a state-log
  // row whose rule resolved to null. Next refresh re-queries cleanly.
  const allEvents: ActivityEventRow[] = useMemo(
    () =>
      (result.data?.target?.metricAlertRuleStateLog ?? [])
        .filter((e): e is typeof e & { rule: NonNullable<typeof e.rule> } => e.rule !== null)
        .map(e => ({ ...e, rule: { ...e.rule } })),
    [result.data?.target?.metricAlertRuleStateLog],
  );

  const createdByUsers = useMemo(() => {
    const seen = new Map<string, { id: string; displayName: string }>();
    for (const e of allEvents) {
      if (e.rule.createdBy && !seen.has(e.rule.createdBy.id)) {
        seen.set(e.rule.createdBy.id, e.rule.createdBy);
      }
    }
    return Array.from(seen.values());
  }, [allEvents]);

  const dimensions = useActivityFilterDimensions({ search, navigate, createdByUsers });

  const visibleEvents = useMemo(() => {
    const severities = new Set(search.severities ?? []);
    const types = new Set(search.types ?? []);
    const createdByIds = new Set(search.createdByIds ?? []);
    if (severities.size === 0 && types.size === 0 && createdByIds.size === 0) return allEvents;
    return allEvents.filter(e => {
      if (severities.size > 0 && !severities.has(e.rule.severity as MetricAlertRuleSeverity)) {
        return false;
      }
      if (types.size > 0 && !types.has(e.rule.type as MetricAlertRuleType)) return false;
      if (createdByIds.size > 0) {
        const id = e.rule.createdBy?.id;
        if (!id || !createdByIds.has(id)) return false;
      }
      return true;
    });
  }, [allEvents, search.severities, search.types, search.createdByIds]);

  return (
    <>
      <PageLead
        title="Alert activity"
        description="Monitor alert firings, recoveries, and state changes."
      />

      <div className="mt-6">
        <Filters
          dimensions={dimensions}
          pinnedControls={
            <DateRangePicker
              trigger={
                <Button
                  label={dateRangeController.selectedPreset.label}
                  variant="default"
                  rightIcon={{ icon: ChevronDown, withSeparator: true }}
                />
              }
              selectedRange={dateRangeController.selectedPreset.range}
              onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
              startDate={dateRangeController.startDate}
              validUnits={['d', 'h', 'm']}
              align="start"
            />
          }
        />
      </div>

      <div className="mt-6">
        <AlertActivityChart
          events={visibleEvents}
          from={dateRangeController.resolvedRange.from}
          to={dateRangeController.resolvedRange.to}
        />
      </div>

      <div className="mt-6">
        <AlertActivityTable
          events={visibleEvents}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      </div>
    </>
  );
}
