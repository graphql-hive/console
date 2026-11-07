import {
  ArrowRight,
  CircleCheck,
  CircleDotDashed,
  CircleEllipsis,
  CircleX,
  ExternalLink,
} from 'lucide-react';
import { savedFilterToSearchParams } from '@/components/target/insights/search-params';
import { buttonVariants } from '@/components/ui/primitives/button/button';
import { DescriptionList } from '@/components/ui/primitives/description-list/description-list';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleState,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import { ALERT_STATE_LABEL } from './alert-state-transitions-bar';
import { alertEventDetailStyles } from './alert-event-detail.css';

export const STATE_ICON: Record<
  MetricAlertRuleState,
  { Icon: typeof CircleCheck; className: string }
> = {
  [MetricAlertRuleState.Normal]: {
    Icon: CircleCheck,
    className: alertEventDetailStyles.stateIcon.normal,
  },
  [MetricAlertRuleState.Pending]: {
    Icon: CircleEllipsis,
    className: alertEventDetailStyles.stateIcon.pending,
  },
  [MetricAlertRuleState.Firing]: {
    Icon: CircleX,
    className: alertEventDetailStyles.stateIcon.firing,
  },
  [MetricAlertRuleState.Recovering]: {
    Icon: CircleDotDashed,
    className: alertEventDetailStyles.stateIcon.recovering,
  },
};

const STATE_BADGE_VARIANT: Record<
  MetricAlertRuleState,
  'success' | 'warning' | 'critical' | 'info'
> = {
  [MetricAlertRuleState.Normal]: 'success',
  [MetricAlertRuleState.Pending]: 'warning',
  [MetricAlertRuleState.Firing]: 'critical',
  [MetricAlertRuleState.Recovering]: 'info',
};

/** The state as a badge item for a DataTable status cell. */
export function stateBadgeItem(state: MetricAlertRuleState) {
  const label = ALERT_STATE_LABEL[state];
  return {
    content: label.charAt(0) + label.slice(1).toLowerCase(),
    variant: STATE_BADGE_VARIANT[state],
  };
}

const STATE_SUMMARY_CLASS: Record<MetricAlertRuleState, string> = {
  [MetricAlertRuleState.Normal]: alertEventDetailStyles.stateSummary.normal,
  [MetricAlertRuleState.Pending]: alertEventDetailStyles.stateSummary.pending,
  [MetricAlertRuleState.Firing]: alertEventDetailStyles.stateSummary.firing,
  [MetricAlertRuleState.Recovering]: alertEventDetailStyles.stateSummary.recovering,
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

const COLUMN_LABEL_BY_TYPE: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'Error rate',
  [MetricAlertRuleType.Latency]: 'Latency',
  [MetricAlertRuleType.Traffic]: 'Total requests',
};

const VALUE_FORMATTER_BY_TYPE: Record<MetricAlertRuleType, (n: number) => string> = {
  [MetricAlertRuleType.ErrorRate]: n => `${n.toFixed(1)}%`,
  [MetricAlertRuleType.Latency]: n => formatDuration(n, true),
  [MetricAlertRuleType.Traffic]: n => String(formatNumber(n)),
};

function metricLabel(rule: AlertEventDetailRule): string {
  if (rule.type === MetricAlertRuleType.Latency && rule.metric) {
    return `${rule.metric.toLowerCase()} latency`;
  }
  return METRIC_LABEL_BY_TYPE[rule.type];
}

function metricColumnLabel(rule: AlertEventDetailRule): string {
  // Latency keeps a contextual override when a sub-metric (P95 etc.) is set.
  if (rule.type === MetricAlertRuleType.Latency && rule.metric) {
    return `${rule.metric} latency`;
  }
  return COLUMN_LABEL_BY_TYPE[rule.type];
}

function formatRawValue(type: MetricAlertRuleType, value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return VALUE_FORMATTER_BY_TYPE[type](value);
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
    return `${currentText} (was ${previousText}, ${sign}${delta.toFixed(1)}%)`;
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
      className={shared.inlineRow.gap1_5}
      aria-label={ALERT_STATE_LABEL[state]}
      title={ALERT_STATE_LABEL[state]}
    >
      <Icon className={`${alertEventDetailStyles.badgeIcon} ${className}`} />
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
    <div className={alertEventDetailStyles.flow}>
      <div className={alertEventDetailStyles.flowState}>
        <StateBadge state={fromState} />
        <span className={alertEventDetailStyles.flowLabel}>
          {ALERT_STATE_LABEL[fromState].toLowerCase()}
        </span>
      </div>
      <ArrowRight className={alertEventDetailStyles.flowArrow} />
      <div className={alertEventDetailStyles.flowState}>
        <StateBadge state={toState} />
        <span className={alertEventDetailStyles.flowLabel}>
          {ALERT_STATE_LABEL[toState].toLowerCase()}
        </span>
      </div>
    </div>
  );
}

export function AlertEventDetail({
  rule,
  event,
  showRuleDetailLink,
  ruleId,
}: {
  rule: AlertEventDetailRule;
  event: AlertEventRow;
  showRuleDetailLink?: boolean;
  ruleId?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
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
      className={alertEventDetailStyles.link}
    >
      {rule.savedFilter.name}
      <ExternalLink className={alertEventDetailStyles.linkIcon} />
    </Link>
  ) : (
    '—'
  );

  return (
    <div className={alertEventDetailStyles.root}>
      <div className={`${alertEventDetailStyles.summary} ${STATE_SUMMARY_CLASS[event.toState]}`}>
        {transitionSentence(rule, event.toState, event.value)}
      </div>
      <div className={alertEventDetailStyles.footer}>
        <div className={shared.fillShrinkable}>
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
            className={buttonVariants({ variant: 'primary', layout: 'label' })}
          >
            <span className={alertEventDetailStyles.ruleLinkLabel}>View alert rule detail</span>
            <span className={alertEventDetailStyles.ruleLinkArrow}>
              <ArrowRight className={alertEventDetailStyles.ruleLinkArrowIcon} />
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
