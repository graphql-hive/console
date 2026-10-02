import { useMemo } from 'react';
import { useQuery } from 'urql';
import { AlertActivityChart } from '@/components/target/alerts/alert-activity-chart';
import { useActivityFilterDimensions } from '@/components/target/alerts/alert-activity-filters';
import {
  AlertActivityTable,
  type ActivityEventRow,
} from '@/components/target/alerts/alert-activity-table';
import { ALERTS_POLL_INTERVAL_MS } from '@/components/target/alerts/alert-polling';
import { RetentionNote } from '@/components/organization/billing/retention-note';
import { DateRangePicker, type Preset } from '@/components/ui/date-range-picker';
import { Filters } from '@/components/ui/filters/filter-menu/filters';
import { PageLead } from '@/components/ui/page-lead';
import { graphql } from '@/gql';
import { MetricAlertRuleSeverity, MetricAlertRuleType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { useInterval } from '@/lib/hooks/use-interval';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { getRouteApi, useRouter } from '@tanstack/react-router';

export const TargetAlertsActivityPage_RetentionQuery = graphql(`
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

export const TargetAlertsActivityPage_Query = graphql(`
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

export const presetLast1Hour: Preset = {
  name: 'last1h',
  label: 'Last 1 hour',
  range: { from: 'now-1h', to: 'now' },
};

const activityRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/alerts/with-nav/',
);

export function TargetAlertsActivityPage() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
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

  return <ActivityView retentionInDays={retentionInDays} />;
}

function ActivityView(props: { retentionInDays: number }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { retentionInDays } = props;
  const search = activityRoute.useSearch();
  const navigate = activityRoute.useNavigate();
  const router = useRouter();
  // Resolved by the route loader, so the chart, the query and the loader share one clock.
  const { period } = activityRoute.useLoaderData();

  const dateRangeController = useDateRangeController({
    dataRetentionInDays: retentionInDays,
    defaultPreset: presetLast1Hour,
    subject: 'alert activity',
  });

  // The loader revalidates within the minute and moves the bounds when it rolls.
  useInterval(ALERTS_POLL_INTERVAL_MS, () => void router.invalidate());

  const [result] = useQuery({
    query: TargetAlertsActivityPage_Query,
    variables: { organizationSlug, projectSlug, targetSlug, from: period.from, to: period.to },
  });

  const data = useKeepPreviousData(result.data, result.fetching || result.stale);

  const allEvents: ActivityEventRow[] = useMemo(
    () =>
      (data?.target?.metricAlertRuleStateLog ?? [])
        .filter((e): e is typeof e & { rule: NonNullable<typeof e.rule> } => e.rule !== null)
        .map(e => ({ ...e, rule: { ...e.rule } })),
    [data?.target?.metricAlertRuleStateLog],
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

  const tableResetKey = JSON.stringify([
    search.severities ?? [],
    search.types ?? [],
    search.createdByIds ?? [],
    search.from ?? null,
    search.to ?? null,
  ]);

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
              size="compact"
              selectedRange={dateRangeController.selectedPreset.range}
              onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
              startDate={dateRangeController.startDate}
              align="start"
              footer={
                <RetentionNote
                  retentionInDays={dateRangeController.retentionInDays}
                  subject={dateRangeController.subject}
                />
              }
            />
          }
        />
      </div>

      <div className="mt-6">
        <AlertActivityChart events={visibleEvents} from={period.from} to={period.to} />
      </div>

      <div className="mt-6">
        <AlertActivityTable
          key={tableResetKey}
          events={visibleEvents}
          loading={result.fetching && !data}
        />
      </div>
    </>
  );
}
