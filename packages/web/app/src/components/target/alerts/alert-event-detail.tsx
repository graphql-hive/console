import {
  ArrowRight,
  CircleCheck,
  CircleDotDashed,
  CircleEllipsis,
  CircleX,
  ExternalLink,
} from 'lucide-react';
import { buttonVariants } from '@/components/base/button/button';
import { DescriptionList } from '@/components/base/description-list/description-list';
import { savedFilterToSearchParams } from '@/components/target/insights/search-params';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleState,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { Link } from '@tanstack/react-router';
import { ALERT_STATE_LABEL } from './alert-state-transitions-bar';

export const STATE_ICON: Record<
  MetricAlertRuleState,
  { Icon: typeof CircleCheck; className: string }
> = {
  [MetricAlertRuleState.Normal]: { Icon: CircleCheck, className: 'text-success' },
  [MetricAlertRuleState.Pending]: { Icon: CircleEllipsis, className: 'text-warning' },
  [MetricAlertRuleState.Firing]: { Icon: CircleX, className: 'text-critical' },
  [MetricAlertRuleState.Recovering]: { Icon: CircleDotDashed, className: 'text-info' },
};

const STATE_SUMMARY_CLASS: Record<MetricAlertRuleState, string> = {
  [MetricAlertRuleState.Normal]: 'border-success_10 bg-success_08 text-success',
  [MetricAlertRuleState.Pending]: 'border-warning_10 bg-warning_08 text-warning',
  [MetricAlertRuleState.Firing]: 'border-critical_10 bg-critical_08 text-critical',
  [MetricAlertRuleState.Recovering]: 'border-info_10 bg-info_08 text-info',
};

export type AlertEventRow = {
  id: string;
  fromState: MetricAlertRuleState;
  toState: MetricAlertRuleState;
  value?: number | null;
  previousValue?: number | null;
  thresholdValue?: number | null;
  createdAt: string;
};

type SavedFilter = {
  id: string;
  name: string;
  filters: {
    operationHashes: string[];
    clientFilters: ReadonlyArray<{ name: string; versions?: string[] | null }>;
    dateRange?: { from: string; to: string } | null;
    excludeOperations?: boolean | null;
    excludeClientFilters?: boolean | null;
  };
};

export type AlertEventDetailRule = {
  name: string;
  type: MetricAlertRuleType;
  metric?: string | null;
  direction: MetricAlertRuleDirection;
  thresholdType: MetricAlertRuleThresholdType;
  thresholdValue: number;
  timeWindowMinutes: number;
  savedFilter?: SavedFilter | null;
};

const METRIC_LABEL_BY_TYPE: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'error rate',
  [MetricAlertRuleType.Latency]: 'latency',
  [MetricAlertRuleType.Traffic]: 'total requests',
};

function metricLabel(rule: AlertEventDetailRule): string {
  if (rule.type === MetricAlertRuleType.Latency && rule.metric) {
    return `${rule.metric.toLowerCase()} latency`;
  }
  return METRIC_LABEL_BY_TYPE[rule.type];
}

function metricColumnLabel(rule: AlertEventDetailRule): string {
  if (rule.type === MetricAlertRuleType.Latency) {
    return rule.metric ? `${rule.metric} latency` : 'Latency';
  }
  if (rule.type === MetricAlertRuleType.ErrorRate) return 'Error rate';
  return 'Total requests';
}

function formatRawValue(type: MetricAlertRuleType, value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (type === MetricAlertRuleType.Latency) return formatDuration(value, true);
  if (type === MetricAlertRuleType.ErrorRate) return `${value.toFixed(1)}%`;
  return String(formatNumber(value));
}

function formatTimeWindow(minutes: number): string {
  if (minutes >= 24 * 60) {
    const days = minutes / (24 * 60);
    return `last ${days === 1 ? '1 day' : `${days} days`}`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `last ${hours === 1 ? '1 hour' : `${hours} hours`}`;
  }
  return `last ${minutes === 1 ? '1 minute' : `${minutes} minutes`}`;
}

function thresholdSummary(rule: AlertEventDetailRule): string {
  const dir = rule.direction === MetricAlertRuleDirection.Above ? 'above' : 'below';
  if (rule.thresholdType === MetricAlertRuleThresholdType.PercentageChange) {
    return `${dir} ${rule.thresholdValue}%`;
  }
  return `${dir} ${formatRawValue(rule.type, rule.thresholdValue)}`;
}

function valueWithDelta(
  rule: AlertEventDetailRule,
  current: number | null | undefined,
  previous: number | null | undefined,
): string {
  if (current === null || current === undefined) return '—';
  const currentText = formatRawValue(rule.type, current);
  if (previous === null || previous === undefined) return currentText;
  const previousText = formatRawValue(rule.type, previous);
  if (rule.type === MetricAlertRuleType.ErrorRate) {
    const delta = current - previous;
    const sign = delta >= 0 ? '+' : '';
    return `${currentText} (was ${previousText}, ${sign}${delta.toFixed(1)}pp)`;
  }
  if (previous !== 0) {
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${currentText} (was ${previousText}, ${sign}${pct.toFixed(1)}%)`;
  }
  return `${currentText} (was ${previousText})`;
}

function transitionSentence(
  rule: AlertEventDetailRule,
  toState: MetricAlertRuleState,
  current: number | null | undefined,
): string {
  const ml = metricLabel(rule);
  const tw = formatTimeWindow(rule.timeWindowMinutes);
  const valueText = formatRawValue(rule.type, current);
  const thrText = formatRawValue(rule.type, rule.thresholdValue);
  const isAbove = rule.direction === MetricAlertRuleDirection.Above;
  const breachVerb = isAbove ? 'exceeding' : 'falling below';
  const recoverVerb = isAbove ? 'back below' : 'back above';

  switch (toState) {
    case MetricAlertRuleState.Pending:
      return `"${rule.name}" entered pending because ${ml} reached ${valueText} over the ${tw}, ${breachVerb} the ${thrText} threshold.`;
    case MetricAlertRuleState.Firing:
      return `"${rule.name}" was triggered because ${ml} reached ${valueText} over the ${tw}, ${breachVerb} the ${thrText} threshold.`;
    case MetricAlertRuleState.Recovering:
      return `"${rule.name}" began recovering as ${ml} returned to ${valueText} over the ${tw}, ${recoverVerb} the ${thrText} threshold.`;
    case MetricAlertRuleState.Normal:
      return `"${rule.name}" returned to normal with ${ml} at ${valueText} over the ${tw}.`;
  }
}

export function StateBadge({ state }: { state: MetricAlertRuleState }) {
  const { Icon, className } = STATE_ICON[state];
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={ALERT_STATE_LABEL[state]}
      title={ALERT_STATE_LABEL[state]}
    >
      <Icon className={`size-3 ${className}`} />
    </span>
  );
}

export function StateFlow({
  fromState,
  toState,
}: {
  fromState: MetricAlertRuleState;
  toState: MetricAlertRuleState;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <div className="inline-flex gap-1">
        <StateBadge state={fromState} />
        <span className="capitalize">{ALERT_STATE_LABEL[fromState].toLowerCase()}</span>
      </div>
      <ArrowRight className="text-neutral-10 size-3" />
      <div className="inline-flex gap-1">
        <StateBadge state={toState} />
        <span className="capitalize">{ALERT_STATE_LABEL[toState].toLowerCase()}</span>
      </div>
    </div>
  );
}

export function AlertEventDetail({
  rule,
  event,
  organizationSlug,
  projectSlug,
  targetSlug,
  showRuleDetailLink,
  ruleId,
}: {
  rule: AlertEventDetailRule;
  event: AlertEventRow;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  showRuleDetailLink?: boolean;
  ruleId?: string;
}) {
  const onFilterValue = rule.savedFilter ? (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug/insights"
      params={{ organizationSlug, projectSlug, targetSlug }}
      search={savedFilterToSearchParams({
        id: rule.savedFilter.id,
        filters: {
          operationHashes: rule.savedFilter.filters.operationHashes,
          clientFilters: rule.savedFilter.filters.clientFilters,
          dateRange: rule.savedFilter.filters.dateRange,
          excludeOperations: rule.savedFilter.filters.excludeOperations ?? undefined,
          excludeClientFilters: rule.savedFilter.filters.excludeClientFilters ?? undefined,
        },
      })}
      target="_blank"
      rel="noreferrer"
      className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
    >
      {rule.savedFilter.name}
      <ExternalLink className="size-3" />
    </Link>
  ) : (
    '—'
  );

  return (
    <div className="space-y-4 px-4 pb-4">
      <div
        className={`rounded-md border px-3 py-2 text-[13px] ${STATE_SUMMARY_CLASS[event.toState]}`}
      >
        {transitionSentence(rule, event.toState, event.value)}
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <DescriptionList
            rows={[
              {
                items: [
                  {
                    term: 'Status',
                    description: <StateFlow fromState={event.fromState} toState={event.toState} />,
                  },
                  { term: 'Threshold', description: thresholdSummary(rule) },
                  {
                    term: metricColumnLabel(rule),
                    description: valueWithDelta(rule, event.value, event.previousValue),
                  },
                  { term: 'Range', description: formatTimeWindow(rule.timeWindowMinutes) },
                  { term: 'On filter', description: onFilterValue },
                ],
              },
            ]}
          />
        </div>
        {showRuleDetailLink && ruleId ? (
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/alerts/$ruleId"
            params={{ organizationSlug, projectSlug, targetSlug, ruleId }}
            className={buttonVariants({ variant: 'primary' })}
          >
            <span className="px-2.5 py-1.5 text-[13px]">View alert rule detail</span>
            <span className="border-l border-l-current/20 px-2 py-1.5">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
