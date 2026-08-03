import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MetricAlertRuleState } from '@/gql/graphql';
import { ALERT_CHART_INSET_LEFT, ALERT_CHART_INSET_RIGHT } from './alert-chart-layout';

export const ALERT_STATE_COLOR: Record<MetricAlertRuleState, string> = {
  [MetricAlertRuleState.Normal]: 'bg-success',
  [MetricAlertRuleState.Pending]: 'bg-warning',
  [MetricAlertRuleState.Firing]: 'bg-critical',
  [MetricAlertRuleState.Recovering]: 'bg-info',
};

export const ALERT_STATE_LABEL: Record<MetricAlertRuleState, string> = {
  [MetricAlertRuleState.Normal]: 'Normal',
  [MetricAlertRuleState.Pending]: 'Pending',
  [MetricAlertRuleState.Firing]: 'Firing',
  [MetricAlertRuleState.Recovering]: 'Recovering',
};

export const ALERT_STATE_DOT_COLOR: Record<
  MetricAlertRuleState,
  'red' | 'yellow' | 'green' | 'orange'
> = {
  [MetricAlertRuleState.Normal]: 'green',
  [MetricAlertRuleState.Pending]: 'yellow',
  [MetricAlertRuleState.Firing]: 'red',
  [MetricAlertRuleState.Recovering]: 'orange',
};

type StateChange = {
  id: string;
  fromState: MetricAlertRuleState;
  toState: MetricAlertRuleState;
  createdAt: string;
};

type AlertStateTransitionsBarProps = {
  stateLog: StateChange[];
  from: string;
  to: string;
  /** State the rule was in before the window started (defaults to Normal). */
  initialState?: MetricAlertRuleState;
  /**
   * When the rule was created. The slice of the window before this timestamp
   * is rendered as "no data" rather than NORMAL — without it, a brand-new
   * rule's bar would falsely claim it was Normal for the entire pre-creation
   * window.
   */
  ruleCreatedAt?: string;
};

type SegmentState = MetricAlertRuleState | 'NO_DATA';

const NO_DATA_COLOR = 'bg-neutral-6';
const NO_DATA_LABEL = 'No data';

function colorForSegment(state: SegmentState): string {
  return state === 'NO_DATA' ? NO_DATA_COLOR : ALERT_STATE_COLOR[state];
}

function labelForSegment(state: SegmentState): string {
  return state === 'NO_DATA' ? NO_DATA_LABEL : ALERT_STATE_LABEL[state];
}

const TICK_COUNT = 7;

function formatTick(date: Date, rangeMs: number): string {
  // 12-hour clock to match the Latency/metric chart's axis (which renders
  // "6:25 PM"); the two sit next to each other on the rule-detail page.
  const options: Intl.DateTimeFormatOptions =
    rangeMs < 24 * 60 * 60 * 1000
      ? { hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    hour12: true,
  });
}

export function AlertStateTransitionsBar({
  stateLog,
  from,
  to,
  initialState = MetricAlertRuleState.Normal,
  ruleCreatedAt,
}: AlertStateTransitionsBarProps) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const rangeMs = Math.max(1, toMs - fromMs);
  const ruleCreatedAtMs = ruleCreatedAt ? new Date(ruleCreatedAt).getTime() : null;

  // Sort transitions ascending by createdAt
  const sorted = [...stateLog].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Build segments: one per state period between transitions.
  const segments: Array<{
    state: SegmentState;
    startMs: number;
    endMs: number;
  }> = [];

  let cursorMs = fromMs;

  // Prepend a "no data" segment for the slice of the window before the rule
  // existed. Without this, a brand-new rule's bar shows green across its
  // entire pre-creation window, falsely implying it was Normal then.
  if (ruleCreatedAtMs !== null && ruleCreatedAtMs > fromMs) {
    const noDataEnd = Math.min(ruleCreatedAtMs, toMs);
    segments.push({ state: 'NO_DATA', startMs: fromMs, endMs: noDataEnd });
    cursorMs = noDataEnd;
  }

  let cursorState: MetricAlertRuleState = sorted[0]?.fromState ?? initialState;

  for (const change of sorted) {
    const changeMs = new Date(change.createdAt).getTime();
    if (changeMs <= cursorMs) {
      cursorState = change.toState;
      continue;
    }
    segments.push({
      state: cursorState,
      startMs: cursorMs,
      endMs: Math.min(changeMs, toMs),
    });
    cursorMs = changeMs;
    cursorState = change.toState;
    if (cursorMs >= toMs) break;
  }

  if (cursorMs < toMs) {
    segments.push({ state: cursorState, startMs: cursorMs, endMs: toMs });
  }

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const ratio = i / (TICK_COUNT - 1);
    return new Date(fromMs + ratio * rangeMs);
  });

  return (
    // Pad to the metric chart's fixed plot insets so the bar's segments and
    // tick labels line up time-wise with the chart below it.
    <div
      className="space-y-2"
      style={{ paddingLeft: ALERT_CHART_INSET_LEFT, paddingRight: ALERT_CHART_INSET_RIGHT }}
    >
      <TooltipProvider delayDuration={100}>
        <div className="border-neutral-5 flex h-4 w-full overflow-hidden rounded-sm border">
          {segments.map((seg, i) => {
            const widthPct = ((seg.endMs - seg.startMs) / rangeMs) * 100;
            if (widthPct <= 0) return null;
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`${colorForSegment(seg.state)} h-full`}
                    style={{ width: `${widthPct}%` }}
                    aria-label={`${labelForSegment(seg.state)} ${formatTimestamp(
                      new Date(seg.startMs).toISOString(),
                    )} - ${formatTimestamp(new Date(seg.endMs).toISOString())}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="text-neutral-12 font-medium">{labelForSegment(seg.state)}</div>
                    <div className="text-neutral-10">
                      {formatTimestamp(new Date(seg.startMs).toISOString())} →{' '}
                      {formatTimestamp(new Date(seg.endMs).toISOString())}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div className="text-neutral-10 flex justify-between text-[11px]">
        {ticks.map((tick, i) => (
          <span key={i}>{formatTick(tick, rangeMs)}</span>
        ))}
      </div>
    </div>
  );
}
