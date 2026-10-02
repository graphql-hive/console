import { useEffect, useState } from 'react';
import {
  addDays,
  addHours,
  endOfMinute,
  formatISO,
  startOfMinute,
  subHours,
  subMilliseconds,
  subSeconds,
} from 'date-fns';
import { availablePresets, buildDateRangeString, Preset } from '@/components/ui/date-range-picker';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { parse, resolveRange } from '@/lib/date-math';
import { subDays } from '@/lib/date-time';
import { UTCDate } from '@date-fns/utc';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useResetState } from './use-reset-state';

export function useDateRangeController(args: {
  /** the data retention aka minimum time range. */
  dataRetentionInDays: number;
  /** the default preset to pick if no range is provided. */
  defaultPreset: Preset;
  /** controlled input range */
  range?: Preset['range'];
  /** what the retention keeps, for the toast; "usage data" unless a page says otherwise. */
  subject?: string;
}) {
  const router = useRouter();
  const subject = args.subject ?? 'usage data';

  const [startDate] = useResetState(
    () => retentionBoundary(args.dataRetentionInDays),
    [args.dataRetentionInDays],
  );
  const searchParams = router.latestLocation.search;
  const fromRaw =
    args.range?.from ?? ((('from' in searchParams && searchParams.from) ?? '') as string);
  const toRaw = args.range?.to ?? ((('to' in searchParams && searchParams.to) ?? 'now') as string);

  const [selectedPreset] = useResetState(
    () => selectPreset({ from: fromRaw, to: toRaw, defaultPreset: args.defaultPreset }),
    [fromRaw, toRaw],
  );

  const [triggerRefreshCounter, setTriggerRefreshCounter] = useState(0);
  const [resolved] = useResetState(
    () => resolvePeriod(selectedPreset.range),
    [selectedPreset.range, triggerRefreshCounter],
  );

  // A route that reset the range to this default left a note in history state; say so once.
  const { toast } = useToast();
  const state = useRouterState({ select: current => current.location.state });
  useEffect(() => {
    if (!state.rangeReset || announced(state.key ?? '')) {
      return;
    }
    toast({
      title: `Date range reset to ${args.defaultPreset.label}`,
      description:
        state.rangeReset === 'retention'
          ? `Your plan keeps the last ${args.dataRetentionInDays} days of ${subject}.`
          : 'This page cannot show the range the URL carried.',
    });
  }, [state, toast, args.defaultPreset.label, args.dataRetentionInDays, subject]);

  return {
    startDate,
    retentionInDays: args.dataRetentionInDays,
    subject,
    selectedPreset,
    setSelectedPreset(preset: Preset) {
      void router.navigate({
        to: '.',
        search: {
          ...searchParams,
          from: preset.range.from,
          to: preset.range.to,
        },
        replace: true,
      });
    },
    resolvedRange: resolved.range,
    refreshResolvedRange() {
      setTriggerRefreshCounter(c => c + 1);
      // A loader-backed route reloads its documents; elsewhere this only re-runs the layout loaders.
      void router.invalidate();
    },
    resolution: resolved.resolution,
  } as const;
}

// The note survives a reload and a return to the entry; remember which one was announced.
const ANNOUNCED = 'hive:range-reset:announced';
function announced(entryKey: string): boolean {
  try {
    if (sessionStorage.getItem(ANNOUNCED) === entryKey) {
      return true;
    }
    sessionStorage.setItem(ANNOUNCED, entryKey);
  } catch {
    // Without storage the toast repeats on a reload, nothing worse.
  }
  return false;
}

type DateRangeArgs = { from?: string; to?: string; defaultPreset: Preset };

/** The preset the URL names, a custom one for a range it spells out, or the default. */
export function selectPreset(args: DateRangeArgs, now: UTCDate = new UTCDate()): Preset {
  const fromRaw = args.from ?? '';
  const toRaw = args.to ?? 'now';
  const preset = availablePresets.find(p => p.range.from === fromRaw && p.range.to === toRaw);
  if (preset) {
    return preset;
  }

  const from = parse(fromRaw, now);
  const to = parse(toRaw, now);
  if (!from || !to) {
    return args.defaultPreset;
  }

  return {
    name: `${fromRaw}_${toRaw}`,
    label: buildDateRangeString({ from, to }),
    range: { from: fromRaw, to: toRaw },
  };
}

/** A range's period and resolution, as the insights queries take them. */
export function resolvePeriod(range: Preset['range'], now: UTCDate = new UTCDate()) {
  const parsed = resolveRange(range, now);
  const from = new Date(parsed.from);
  let to = new Date(parsed.to);
  if (from.getTime() === to.getTime()) {
    to = subSeconds(addHours(to, 24), 1);
  }

  const resolved = resolveRangeAndResolution({ from, to }, now);
  return {
    resolution: resolved.resolution,
    range: {
      from: formatISO(resolved.range.from),
      to: formatISO(resolved.range.to),
    },
  };
}

/** Both, from the URL's search: what a route loader and the page must agree on. */
export function resolveDateRange(args: DateRangeArgs, now: UTCDate = new UTCDate()) {
  const selectedPreset = selectPreset(args, now);
  return { selectedPreset, ...resolvePeriod(selectedPreset.range, now) };
}

// What a link into another period page carries: the URL's own range, or nothing.
export function carriedRange(search: Record<string, unknown>): { from?: string; to?: string } {
  return typeof search.from === 'string' && typeof search.to === 'string'
    ? { from: search.from, to: search.to }
    : {};
}

// The URL's range as a loader returns it and its page reads it.
export function loaderPeriod(
  deps: { from?: string; to?: string },
  defaultPreset: Preset,
  now?: UTCDate,
) {
  const { range: period, resolution } = resolveDateRange(
    { from: deps.from, to: deps.to, defaultPreset },
    now,
  );
  return { period, resolution };
}

const maximumResolution = 90;
const minimumResolution = 1;

function resolveResolution(resolution: number) {
  return Math.max(minimumResolution, Math.min(resolution, maximumResolution));
}

const msMinute = 60 * 1000;
const msHour = msMinute * 60;
const msDay = msHour * 24;

const thresholdDataPointPerDay = 28;
const thresholdDataPointPerHour = 24;

const tableTTLInHours = {
  daily: 365 * 24,
  hourly: 30 * 24,
  minutely: 24,
};

/** Get the UTC start date of a day */
function getUTCStartOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Get the UTC end date of a day */
function getUTCEndOfDay(date: Date) {
  return subMilliseconds(getUTCStartOfDay(addDays(date, 1)), 1);
}

function startOfHour(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()),
  );
}

function endOfHour(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      59,
      59,
      999,
    ),
  );
}

// The UTC day the retention reaches back to; every check compares against it, not the instant.
export function retentionBoundary(retentionInDays: number, now = new Date()): Date {
  return getUTCStartOfDay(subDays(now, retentionInDays));
}

export function resolveRangeAndResolution(range: { from: Date; to: Date }, now = new Date()) {
  const tableOldestDateTimePoint = {
    /** Because ClickHouse uses UTC and we aggregate to UTC start fo day, we need to get the UTC day here */
    daily: getUTCStartOfDay(subHours(now, tableTTLInHours.daily)),
    hourly: startOfHour(subHours(now, tableTTLInHours.hourly)),
    minutely: startOfMinute(subHours(now, tableTTLInHours.minutely)),
  };

  if (
    range.to.getTime() < tableOldestDateTimePoint.daily.getTime() ||
    range.from.getTime() < tableOldestDateTimePoint.daily.getTime()
  ) {
    throw new Error('This range can never be resolved.');
  }

  const daysDifference = (range.to.getTime() - range.from.getTime()) / msDay;

  if (
    daysDifference > thresholdDataPointPerDay ||
    /** if we are outside this range, we always need to get daily data */
    range.to.getTime() <= tableOldestDateTimePoint.hourly.getTime() ||
    range.from.getTime() <= tableOldestDateTimePoint.hourly.getTime()
  ) {
    const resolvedRange = {
      from: getUTCStartOfDay(range.from),
      to: getUTCEndOfDay(range.to),
    };
    const daysDifference = Math.floor(
      (resolvedRange.to.getTime() - resolvedRange.from.getTime()) / msDay,
    );

    // try to have at least 1 data points per day, unless the range has more than 90 days.
    return {
      resolution: resolveResolution(daysDifference),
      range: resolvedRange,
    };
  }

  const hoursDifference = (range.to.getTime() - range.from.getTime()) / msHour;

  if (
    hoursDifference > thresholdDataPointPerHour ||
    /** if we are outside this range, we always need to get hourly data */
    range.to.getTime() <= tableOldestDateTimePoint.minutely.getTime() ||
    range.from.getTime() <= tableOldestDateTimePoint.minutely.getTime()
  ) {
    const resolvedRange = {
      from: startOfHour(range.from),
      to: endOfHour(range.to),
    };
    const hoursDifference = Math.floor(
      (resolvedRange.to.getTime() - resolvedRange.from.getTime()) / msHour,
    );

    // try to have at least 1 data points per hour, unless the range has more than 90 hours.
    return {
      resolution: resolveResolution(hoursDifference),
      range: resolvedRange,
    };
  }

  const resolvedRange = {
    from: startOfMinute(range.from),
    to: endOfMinute(range.to),
  };

  const minutesDifference = Math.floor(
    (resolvedRange.to.getTime() - resolvedRange.from.getTime()) / msMinute,
  );

  return {
    resolution: resolveResolution(minutesDifference),
    range: resolvedRange,
  };
}
