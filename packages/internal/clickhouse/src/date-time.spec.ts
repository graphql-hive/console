import { formatDateTime, parseDateTime } from './date-time';

test('formats as the UTC text form ClickHouse prints, regardless of the process timezone', () => {
  expect(formatDateTime(new Date('2026-11-02T05:07:09.123Z'))).toBe('2026-11-02 05:07:09');
});

test('parses the text form back as UTC', () => {
  expect(parseDateTime('2026-11-02 05:07:09').toISOString()).toBe('2026-11-02T05:07:09.000Z');
});
