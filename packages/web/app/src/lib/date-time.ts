import { subHours } from 'date-fns';

// subDays from date-fns adjusts the hour based on daylight savings time.
// We want to keep the hour the same, so we use subHours instead.
export function subDays(date: Date | number, days: number) {
  return subHours(date, days * 24);
}

export function createAdaptiveTimeFormatter(from?: string, to?: string) {
  let options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  if (from && to) {
    const range = new Date(to).getTime() - new Date(from).getTime();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const month = 30 * day;

    if (range < 13 * hour) {
      options = {
        hour: '2-digit',
        minute: '2-digit',
      };
    } else if (range < 2 * day) {
      options = {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      };
    } else if (range < 2 * month) {
      options = {
        day: '2-digit',
        month: '2-digit',
      };
    } else {
      options = {
        month: '2-digit',
        year: 'numeric',
      };
    }
  }

  const formatter = new Intl.DateTimeFormat('en-GB', options);

  return (value: number) => formatter.format(value);
}
