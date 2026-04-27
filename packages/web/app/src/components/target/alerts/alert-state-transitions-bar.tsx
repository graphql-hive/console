import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MetricAlertRuleState } from '@/gql/graphql';

export const ALERT_STATE_COLOR: Record<MetricAlertRuleState, string> = {
  [MetricAlertRuleState.Normal]: 'bg-success',
  [MetricAlertRuleState.Pending]: 'bg-warning',
  [MetricAlertRuleState.Firing]: 'bg-critical',
  [MetricAlertRuleState.Recovering]: 'bg-orange-500',
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
};

const TICK_COUNT = 7;

function formatTick(date: Date, rangeMs: number): string {
  const options: Intl.DateTimeFormatOptions =
    rangeMs < 24 * 60 * 60 * 1000
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    hour12: false,
  });
}

export function AlertStateTransitionsBar({
  stateLog,
  from,
  to,
  initialState = MetricAlertRuleState.Normal,
}: AlertStateTransitionsBarProps) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const rangeMs = Math.max(1, toMs - fromMs);

  // Sort transitions ascending by createdAt
  const sorted = [...stateLog].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Build segments: one per state period between transitions.
  const segments: Array<{
    state: MetricAlertRuleState;
    startMs: number;
    endMs: number;
    transition: StateChange | null;
  }> = [];

  let cursorMs = fromMs;
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
      transition: null,
    });
    cursorMs = changeMs;
    cursorState = change.toState;
    if (cursorMs >= toMs) break;
  }

  if (cursorMs < toMs) {
    segments.push({ state: cursorState, startMs: cursorMs, endMs: toMs, transition: null });
  }

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const ratio = i / (TICK_COUNT - 1);
    return new Date(fromMs + ratio * rangeMs);
  });

  return (
    <div className="space-y-2">
      <TooltipProvider delayDuration={100}>
        <div className="border-neutral-5 flex h-4 w-full overflow-hidden rounded-sm border">
          {segments.map((seg, i) => {
            const widthPct = ((seg.endMs - seg.startMs) / rangeMs) * 100;
            if (widthPct <= 0) return null;
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`${ALERT_STATE_COLOR[seg.state]} h-full`}
                    style={{ width: `${widthPct}%` }}
                    aria-label={`${ALERT_STATE_LABEL[seg.state]} ${formatTimestamp(
                      new Date(seg.startMs).toISOString(),
                    )} - ${formatTimestamp(new Date(seg.endMs).toISOString())}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="text-neutral-12 font-medium">
                      {ALERT_STATE_LABEL[seg.state]}
                    </div>
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
