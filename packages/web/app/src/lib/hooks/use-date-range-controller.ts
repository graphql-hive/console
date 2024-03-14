import { useState } from 'react';
import { useRouter } from 'next/router';
import { addHours, formatISO, startOfHour, startOfMinute, subHours, subSeconds } from 'date-fns';
import { availablePresets, buildDateRangeString, Preset } from '@/components/ui/date-range-picker';
import { parse, resolveRange } from '@/lib/date-math';
import { subDays } from '@/lib/date-time';
import { useResetState } from './use-reset-state';

export function useDateRangeController(args: {
  dataRetentionInDays: number;
  defaultPreset: Preset;
}) {
  const router = useRouter();
  const [href, urlParameter] = router.asPath.split('?');

  const [startDate] = useResetState(
    () => subDays(new Date(), args.dataRetentionInDays),
    [args.dataRetentionInDays],
  );

  const params = new URLSearchParams(urlParameter);
  const fromRaw = params.get('from') ?? '';
  const toRaw = params.get('to') ?? 'now';

  const [selectedPreset] = useResetState(() => {
    const preset = availablePresets.find(p => p.range.from === fromRaw && p.range.to === toRaw);

    if (preset) {
      return preset;
    }

    const from = parse(fromRaw);
    const to = parse(toRaw);

    if (!from || !to) {
      return args.defaultPreset;
    }

    return {
      name: `${fromRaw}_${toRaw}`,
      label: buildDateRangeString({ from, to }),
      range: { from: fromRaw, to: toRaw },
    };
  }, [fromRaw, toRaw]);

  const [triggerRefreshCounter, setTriggerRefreshCounter] = useState(0);
  const [resolved] = useResetState(() => {
    const parsed = resolveRange(selectedPreset.range);

    const from = new Date(parsed.from);
    let to = new Date(parsed.to);

    if (from.getTime() === to.getTime()) {
      to = subSeconds(addHours(new Date(), 20), 1);
    }

    const resolved = resolveRangeAndResolution({
      from,
      to,
    });

    return {
      resolution: resolved.resolution,
      range: {
        from: formatISO(resolved.range.from),
        to: formatISO(resolved.range.to),
      },
    };
  }, [selectedPreset.range, triggerRefreshCounter]);

  return {
    startDate,
    selectedPreset,
    setSelectedPreset(preset: Preset) {
      void router.push(
        `${href}?from=${encodeURIComponent(preset.range.from)}&to=${encodeURIComponent(preset.range.to)}`,
        undefined,
        {
          scroll: false,
          shallow: true,
        },
      );
    },
    resolvedRange: resolved.range,
    refreshResolvedRange() {
      setTriggerRefreshCounter(c => c + 1);
    },
    resolution: resolved.resolution,
  } as const;
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

function resolveRangeAndResolution(range: { from: Date; to: Date }) {
  const now = new Date();
  const tableOldestDateTimePoint = {
    /** Because ClickHouse uses UTC and we aggregate to UTC start fo day, we need to get the UTC day here */
    daily: getUTCStartOfDay(subHours(now, tableTTLInHours.daily)),
    hourly: startOfHour(subHours(now, tableTTLInHours.hourly)),
    minutely: startOfMinute(subHours(now, tableTTLInHours.minutely)),
  };

  const daysDifference = (range.to.getTime() - range.from.getTime()) / msDay;

  if (
    daysDifference > thresholdDataPointPerDay ||
    /** if we are outside this range, we always need to get daily data */
    range.to.getTime() <= tableOldestDateTimePoint.daily.getTime() ||
    range.from.getTime() <= tableOldestDateTimePoint.daily.getTime()
  ) {
    const resolvedRange = {
      from: getUTCStartOfDay(range.from),
      to: subSeconds(getUTCStartOfDay(range.to), 1),
    };
    const daysDifference = Math.round(
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
    range.to.getTime() <= tableOldestDateTimePoint.hourly.getTime() ||
    range.from.getTime() <= tableOldestDateTimePoint.hourly.getTime()
  ) {
    const resolvedRange = {
      from: startOfHour(range.from),
      to: subSeconds(startOfHour(range.to), 1),
    };
    const hoursDifference = Math.round(
      (resolvedRange.to.getTime() - resolvedRange.from.getTime()) / msHour,
    );

    // try to have at least 1 data points per hour, unless the range has more than 90 hours.
    return {
      resolution: resolveResolution(hoursDifference),
      range: resolvedRange,
    };
  }

  if (
    range.to.getTime() <= tableOldestDateTimePoint.minutely.getTime() ||
    range.from.getTime() <= tableOldestDateTimePoint.minutely.getTime()
  ) {
    throw new Error('This range can never be resolved.');
  }

  const resolvedRange = {
    from: startOfMinute(range.from),
    to: subSeconds(startOfMinute(range.to), 1),
  };

  const minutesDifference = Math.round(
    (resolvedRange.to.getTime() - resolvedRange.from.getTime()) / msMinute,
  );

  return {
    resolution: resolveResolution(minutesDifference),
    range: resolvedRange,
  };
}
