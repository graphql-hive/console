/**
 * The text form of a ClickHouse `DateTime('UTC')` value, `yyyy-MM-dd HH:mm:ss`: what the server
 * prints for such columns and accepts for them as a literal or a bound parameter.
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function parseDateTime(text: string): Date {
  return new Date(text.replace(' ', 'T') + 'Z');
}
