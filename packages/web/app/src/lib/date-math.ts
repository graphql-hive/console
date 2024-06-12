/**
 * The original source code was taken from Grafana's date-math.ts file and adjusted for Hive needs.
 * @source https://github.com/grafana/grafana/blob/411c89012febe13323e4b8aafc8d692f4460e680/packages/grafana-data/src/datetime/datemath.ts#L1C1-L208C2
 */
import { add, format, formatISO, parse as parseDate, sub, type Duration } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

export type Period = {
  from: string;
  to: string;
};

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

const dateStringFormat = 'yyyy-MM-dd';

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

function isValidDateString(input: string) {
  return input.length === 10 && parseDateString(input) !== undefined;
}

/**
 * Parses different types input to a moment instance. There is a specific formatting language that can be used
 * if text arg is string. See unit tests for examples.
 * @param text
 * @param roundUp See parseDateMath function.
 * @param timezone Only string 'utc' is acceptable here, for anything else, local timezone is used.
 */
export function parse(text: string, now = new UTCDate()): Date | undefined {
  if (!text) {
    return undefined;
  }

  let mathString = '';

  if (text.substring(0, 3) === 'now') {
    // time = dateTimeForTimeZone(timezone);
    mathString = text.substring('now'.length);
  } else if (isValidDateString(text)) {
    return parseDateString(text);
  } else {
    return undefined;
  }

  if (!mathString.length) {
    return now;
  }

  return parseDateMath(mathString, now);
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
