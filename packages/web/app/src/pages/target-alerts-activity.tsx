import { useMemo, useState } from 'react';
import { subMinutes } from 'date-fns';
import { useQuery } from 'urql';
import { Filters } from '@/components/base/floating/filter-menu/filters';
import { Select } from '@/components/base/floating/select/select';
import { PageLead } from '@/components/base/page-lead';
import { AlertActivityChart } from '@/components/target/alerts/alert-activity-chart';
import { useActivityFilterDimensions } from '@/components/target/alerts/alert-activity-filters';
import {
  AlertActivityTable,
  type ActivityEventRow,
} from '@/components/target/alerts/alert-activity-table';
import { graphql } from '@/gql';
import { MetricAlertRuleSeverity, MetricAlertRuleType } from '@/gql/graphql';
import { useNavigate, useSearch } from '@tanstack/react-router';

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

const VIEW_RANGE_OPTIONS = [
  { value: '60', label: 'Last 1 hour' },
  { value: '360', label: 'Last 6 hours' },
  { value: '1440', label: 'Last 24 hours' },
  { value: '10080', label: 'Last 7 days' },
  { value: '43200', label: 'Last 30 days' },
] as const;

const ACTIVITY_ROUTE = '/authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/activity';

export function TargetAlertsActivityPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  const search = useSearch({ from: ACTIVITY_ROUTE });
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
    query: TargetAlertsActivityPage_Query,
    variables: { organizationSlug, projectSlug, targetSlug, from, to },
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
            <Select
              options={[...VIEW_RANGE_OPTIONS]}
              value={viewRangeMinutes}
              onValueChange={setViewRangeMinutes}
            />
          }
        />
      </div>

      <div className="mt-6">
        <AlertActivityChart events={visibleEvents} from={from} to={to} />
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
