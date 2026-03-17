import colors from 'colors';
import { boldQuotedWords } from '../../../packages/libraries/cli/src/helpers/texture/texture';

describe('boldQuotedWords', () => {
  test('handles simple single-quoted strings', () => {
    const input = "Changed value for 'foo'";
    const expected = `Changed value for ${colors.bold('foo')}`;
    expect(boldQuotedWords(input)).toBe(expected);
  });

  test('handles simple double-quoted strings', () => {
    const input = 'Changed value for "foo"';
    const expected = `Changed value for ${colors.bold('foo')}`;
    expect(boldQuotedWords(input)).toBe(expected);
  });

  test('handles multiple quoted strings', () => {
    const input = "Field 'name' on type 'User' was changed";
    const expected = `Field ${colors.bold('name')} on type ${colors.bold('User')} was changed`;
    expect(boldQuotedWords(input)).toBe(expected);
  });

  test('handles string with no quotes', () => {
    const input = 'No quotes here';
    expect(boldQuotedWords(input)).toBe(input);
  });

  test('handles escaped single quotes within single-quoted strings', () => {
    const input =
      "Enum value 'Status.INACTIVE' has deprecation reason 'Use \\'DISABLED\\' instead'";
    const expected = `Enum value ${colors.bold('Status.INACTIVE')} has deprecation reason ${colors.bold("Use 'DISABLED' instead")}`;
    expect(boldQuotedWords(input)).toBe(expected);
  });

  test('handles escaped double quotes within double-quoted strings', () => {
    const input = 'Default value changed from "\\"test\\"" to "other"';
    const expected = `Default value changed from ${colors.bold('"test"')} to ${colors.bold('other')}`;
    expect(boldQuotedWords(input)).toBe(expected);
  });

  test('handles apostrophes when quotes are escaped', () => {
    const input = "Reason 'Use \\'DISABLED\\' instead, it\\'s clearer'";
    const expected = `Reason ${colors.bold("Use 'DISABLED' instead, it's clearer")}`;
    expect(boldQuotedWords(input)).toBe(expected);
  });
});
