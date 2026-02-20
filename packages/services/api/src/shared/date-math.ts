/**
 * Date math parser for resolving relative date strings like "now-7d" to Date objects.
 * Adapted from packages/web/app/src/lib/date-math.ts (originally from Grafana).
 * @source https://github.com/grafana/grafana/blob/411c89012febe13323e4b8aafc8d692f4460e680/packages/grafana-data/src/datetime/datemath.ts
 */
import { add, parse as parseDate, parseISO, sub, type Duration } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

type DurationUnit = 'y' | 'M' | 'w' | 'd' | 'h' | 'm';
const units: DurationUnit[] = ['y', 'M', 'w', 'd', 'h', 'm'];

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
  } catch {
    return undefined;
  }
}

/**
 * Parse a time ISO string or date math expression into an actual Date.
 * Supports: "now", "now-7d", "now+1h", ISO strings, "yyyy-MM-dd HH:mm" strings.
 */
export function parseDateMathExpression(
  text: string,
  now = new UTCDate(),
): Date | undefined {
  if (!text) {
    return undefined;
  }

  if (!text.startsWith('now')) {
    const date = parseDateString(text);
    if (date && !Number.isNaN(date.getTime())) {
      return date;
    }

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

  return parseDateMath(mathExpression, now);
}

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
