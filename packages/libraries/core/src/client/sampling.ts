import type { OperationSampleRate, SamplingContext } from './types.js';

export function randomSampling(sampleRate: number) {
  if (sampleRate > 1 || sampleRate < 0) {
    throw new Error(`Expected usage.sampleRate to be 0 <= x <= 1, received ${sampleRate}`);
  }

  return function shouldInclude(): boolean {
    return Math.random() <= sampleRate;
  };
}

/**
 * Builds a sampling function that applies operation-level sample rates.
 *
 * Each rule matches an operation by exact `name` or by `regex` (tested against the
 * operation name). The first matching rule wins and its `sampleRate` is used.
 * Operations that don't match any rule fall back to `fallbackSampleRate`.
 *
 * Rules are validated eagerly so misconfiguration fails fast at setup time.
 */
export function operationSampling(config: {
  rates: OperationSampleRate[];
  fallbackSampleRate: number;
}) {
  if (config.fallbackSampleRate > 1 || config.fallbackSampleRate < 0) {
    throw new Error(
      `Expected usage.sampleRate to be 0 <= x <= 1, received ${config.fallbackSampleRate}`,
    );
  }

  const rules = config.rates.map(rate => {
    const hasName = typeof rate.name === 'string';
    const hasRegex = rate.regex instanceof RegExp;

    if (hasName === hasRegex) {
      throw new Error(
        'Expected usage.sampleRates entry to define exactly one of "name" or "regex".',
      );
    }

    if (rate.sampleRate > 1 || rate.sampleRate < 0) {
      throw new Error(
        `Expected usage.sampleRates sampleRate to be 0 <= x <= 1, received ${rate.sampleRate}`,
      );
    }

    const matches = hasRegex
      ? (operationName: string) => rate.regex!.test(operationName)
      : (operationName: string) => operationName === rate.name;

    return { matches, sampleRate: rate.sampleRate };
  });

  return function shouldInclude(context: SamplingContext): boolean {
    for (const rule of rules) {
      if (rule.matches(context.operationName)) {
        return Math.random() <= rule.sampleRate;
      }
    }

    return Math.random() <= config.fallbackSampleRate;
  };
}

export function dynamicSampling(sampler: (context: SamplingContext) => number | boolean) {
  return function shouldInclude(context: SamplingContext): boolean {
    let sampleRate = sampler(context);

    if (sampleRate === true) {
      sampleRate = 1;
    } else if (sampleRate === false) {
      sampleRate = 0;
    }

    if (sampleRate > 1 || sampleRate < 0) {
      throw new Error(`Expected usage.sampleRate to be 0 <= x <= 1, received ${sampleRate}`);
    }

    return Math.random() <= sampleRate;
  };
}
