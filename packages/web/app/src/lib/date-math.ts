/**
 * The original source code was taken from Grafana's date-math.ts file and adjusted for Hive needs.
 * @source https://github.com/grafana/grafana/blob/411c89012febe13323e4b8aafc8d692f4460e680/packages/grafana-data/src/datetime/datemath.ts#L1C1-L208C2
 */
import { add, format, formatISO, parse as parseDate, parseISO, sub, type Duration } from 'date-fns';
import { z } from 'zod';
import { UTCDate } from '@date-fns/utc';

export const Period = z.object({
  from: z.string(),
  to: z.string(),
});
export type Period = z.infer<typeof Period>;

export type DurationUnit = 'y' | 'M' | 'w' | 'd' | 'h' | 'm';
export const units: DurationUnit[] = ['y', 'M', 'w', 'd', 'h', 'm'];

function unitToDurationKey(unit: DurationUnit): keyof Duration {
  switch (unit) {
    case 'y':
      return 'years';
    case 'M':
      return 'months';
    case 'w':
      return 'weeks';
    case 'd':
      return 'days';
    case 'h':
      return 'hours';
    case 'm':
      return 'minutes';
  }
}

const dateStringFormat = 'yyyy-MM-dd HH:mm';

function parseDateString(input: string) {
  try {
    return parseDate(input, dateStringFormat, new UTCDate());
  } catch (error) {
    return undefined;
  }
}

export function formatDateToString(date: Date) {
  return format(date, dateStringFormat);
}

/**
 * Parse a time iso string or formular into an actual date
 */
export function parse(text: string, now = new UTCDate()): Date | undefined {
  if (!text) {
    return undefined;
  }

  if (!text.startsWith('now')) {
    // Try parsing as yyyy-MM-dd HH:mm
    const date = parseDateString(text);
    if (date && !Number.isNaN(date.getTime())) {
      return date;
    }

    // Try parsing as ISO
    const isoDate = parseISO(text);
    if (isoDate && !Number.isNaN(isoDate.getTime())) {
      return isoDate;
    }

    return undefined;
  }

  const mathExpression = text.slice('now'.length);
  if (!mathExpression) {
    return now;
  }

  // Handle "now" with date math (e.g., "now+1d")
  return parseDateMath(mathExpression, now);
}

/**
 * Parses math part of the time string and shifts supplied time according to that math. See unit tests for examples.
 * @param mathString
 * @param time
 * @param roundUp If true it will round the time to endOf time unit, otherwise to startOf time unit.
 */
function parseDateMath(mathString: string, now: Date): Date | undefined {
  const strippedMathString = mathString.replace(/\s/g, '');
  let result = now;
  let i = 0;
  const len = strippedMathString.length;

  while (i < len) {
    const c = strippedMathString.charAt(i++);
    let type;
    let num;
    let unitString: string;

    if (c === '+') {
      type = 1;
    } else if (c === '-') {
      type = 2;
    } else {
      return undefined;
    }

    if (Number.isNaN(parseInt(strippedMathString.charAt(i), 10))) {
      num = 1;
    } else if (strippedMathString.length === 2) {
      num = parseInt(strippedMathString.charAt(i), 10);
    }
    const numFrom = i;
    while (!Number.isNaN(parseInt(strippedMathString.charAt(i), 10))) {
      i++;
      if (i > 10) {
        return undefined;
      }
    }
    num = parseInt(strippedMathString.substring(numFrom, i), 10);

    // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
    if (type === 0 && num !== 1) {
      return undefined;
    }

    unitString = strippedMathString.charAt(i++);

    if (unitString === 'f') {
      unitString = strippedMathString.charAt(i++);
    }

    const unit = unitString as DurationUnit;

    if (!units.includes(unit)) {
      return undefined;
    }

    if (type === 1) {
      result = add(result, {
        [unitToDurationKey(unit)]: num,
      });
    } else if (type === 2) {
      result = sub(result, {
        [unitToDurationKey(unit)]: num,
      });
    }
  }
  return result;
}

export function resolveRange(period: Period) {
  const now = new UTCDate();
  const from = parse(period.from, now);
  const to = parse(period.to, now);

  if (!from || !to) {
    throw new Error('Could not parse date strings.' + JSON.stringify(period));
  }

  return {
    from: formatISO(from),
    to: formatISO(to),
  };
}
