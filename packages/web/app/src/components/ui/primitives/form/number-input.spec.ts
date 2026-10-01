import { z } from 'zod';
import { numberInput } from './number-input';

const messages = (result: z.SafeParseReturnType<unknown, unknown>) =>
  result.success ? [] : result.error.issues.map(issue => issue.message);

describe('numberInput', () => {
  it('reads a typed number, and a cleared input as required rather than as 0', () => {
    const required = numberInput(z.number({ required_error: 'Required' }));
    expect(required.parse('14')).toBe(14);
    expect(required.parse(14)).toBe(14);
    expect(messages(required.safeParse(''))).toEqual(['Required']);
  });

  it('lets an optional schema accept a cleared input as undefined', () => {
    expect(numberInput(z.number().optional()).parse('')).toBeUndefined();
  });
});
