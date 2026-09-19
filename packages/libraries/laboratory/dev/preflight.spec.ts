import { devPreflight, devPreflightScenarios } from './preflight';

describe('dev preflight', () => {
  // The seed is only ever parsed inside the worker, so a syntax error in it would first
  // show up as a broken dev harness in the browser.
  it('parses in the same wrapper the worker uses', () => {
    const AsyncFunction = async function () {}.constructor as new (...args: string[]) => unknown;

    expect(
      () => new AsyncFunction('lab', 'CryptoJS', `with(lab){${devPreflight.script}}`),
    ).not.toThrow();
  });

  it.each(devPreflightScenarios)('handles the %s scenario it offers', scenario => {
    expect(devPreflight.script).toContain(`'${scenario}'`);
  });

  // Seeded off, the Query tab's Run would skip preflight entirely and the path this branch
  // fixes would be unreachable in the harness.
  it('is seeded enabled', () => {
    expect(devPreflight.enabled).toBe(true);
  });
});
