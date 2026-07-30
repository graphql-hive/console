import { parse } from 'graphql';
import { operationSampling, randomSampling } from '../src/client/sampling';
import type { SamplingContext } from '../src/client/types';

const document = parse(/* GraphQL */ `
  query {
    __typename
  }
`);

function context(operationName: string): SamplingContext {
  return {
    operationName,
    document,
    variableValues: null,
    contextValue: undefined,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('operationSampling', () => {
  test('uses the rule sample rate for an exact name match', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const shouldInclude = operationSampling({
      rates: [{ name: 'HighVolume', sampleRate: 0.1 }],
      fallbackSampleRate: 1,
    });

    // 0.5 <= 0.1 -> excluded
    expect(shouldInclude(context('HighVolume'))).toBe(false);

    random.mockReturnValue(0.05);
    // 0.05 <= 0.1 -> included
    expect(shouldInclude(context('HighVolume'))).toBe(true);
  });

  test('uses the rule sample rate for a regex match', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const shouldInclude = operationSampling({
      rates: [{ regex: /^Sampled/, sampleRate: 0.1 }],
      fallbackSampleRate: 1,
    });

    expect(shouldInclude(context('SampledQuery'))).toBe(false);
    // does not match the regex -> falls back to 1.0 -> always included
    expect(shouldInclude(context('OtherQuery'))).toBe(true);
  });

  test('falls back to the global sample rate when no rule matches', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const shouldInclude = operationSampling({
      rates: [{ name: 'HighVolume', sampleRate: 0.1 }],
      fallbackSampleRate: 0,
    });

    // No match -> fallback 0 -> never included (low-volume ops would normally be 1.0 here)
    expect(shouldInclude(context('LowVolume'))).toBe(false);
  });

  test('first matching rule wins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // 0 <= any rate >= 0 -> included unless rate is 0
    const shouldInclude = operationSampling({
      rates: [
        { regex: /Query$/, sampleRate: 1 },
        { name: 'GetUserQuery', sampleRate: 0 },
      ],
      fallbackSampleRate: 0,
    });

    // Matches the first rule (regex) even though the second exact rule also matches.
    expect(shouldInclude(context('GetUserQuery'))).toBe(true);
  });

  test('keeps the high-volume vs low-volume scenario from the feature request', () => {
    // Reports ~10% of high-volume ops and 100% of everything else.
    const shouldInclude = operationSampling({
      rates: [{ regex: /^HighVolume/, sampleRate: 0.1 }],
      fallbackSampleRate: 1,
    });

    const random = vi.spyOn(Math, 'random');

    // High-volume op: below threshold -> sent
    random.mockReturnValue(0.05);
    expect(shouldInclude(context('HighVolumeQuery'))).toBe(true);
    // High-volume op: above threshold -> dropped
    random.mockReturnValue(0.9);
    expect(shouldInclude(context('HighVolumeQuery'))).toBe(false);

    // Low-volume op: always sent regardless of the random draw
    random.mockReturnValue(0.99);
    expect(shouldInclude(context('RareReport'))).toBe(true);
  });

  describe('validation', () => {
    test('throws when a rule defines neither name nor regex', () => {
      expect(() =>
        operationSampling({
          rates: [{ sampleRate: 0.1 } as any],
          fallbackSampleRate: 1,
        }),
      ).toThrow('exactly one of "name" or "regex"');
    });

    test('throws when a rule defines both name and regex', () => {
      expect(() =>
        operationSampling({
          rates: [{ name: 'Foo', regex: /Foo/, sampleRate: 0.1 }],
          fallbackSampleRate: 1,
        }),
      ).toThrow('exactly one of "name" or "regex"');
    });

    test('throws when a rule sample rate is out of range', () => {
      expect(() =>
        operationSampling({
          rates: [{ name: 'Foo', sampleRate: 1.5 }],
          fallbackSampleRate: 1,
        }),
      ).toThrow('0 <= x <= 1');
    });

    test('throws when the fallback sample rate is out of range', () => {
      expect(() =>
        operationSampling({
          rates: [{ name: 'Foo', sampleRate: 0.1 }],
          fallbackSampleRate: -1,
        }),
      ).toThrow('0 <= x <= 1');
    });
  });
});

describe('randomSampling (regression)', () => {
  test('still samples against the provided rate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(randomSampling(0.4)()).toBe(false);
    expect(randomSampling(0.6)()).toBe(true);
  });
});
