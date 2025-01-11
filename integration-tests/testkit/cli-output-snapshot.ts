import stripAnsi from 'strip-ansi';
import type { SnapshotSerializer } from 'vitest';
import { ExecaError } from '@esm2cjs/execa';

// ------------------------------
// Value
// ------------------------------

type Value = ValueSansCleanable | Cleanable<ValueSansCleanable>;

type ValueSansCleanable = ValueUnwrapped | PromiseSettledResult<ValueUnwrapped>;

type ValueUnwrapped = string | ExecaError;

// ------------------------------
// Cleanable
// ------------------------------

interface Cleanable<$Value extends ValueSansCleanable> {
  value: $Value;
  clean: Cleaner;
}

type Cleaner = RegExp | ((value: string) => string);

const isCleanable = (value: unknown): value is Cleanable<ValueSansCleanable> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    'clean' in value &&
    (typeof value.clean === 'function' || value.clean instanceof RegExp)
  );
};

const applyValueCleaners = (cleaners: Cleaner[], value: string) => {
  const regexpMatchReplacer = (_: string, ...args: any[]) => {
    const captures = args.slice(0, -2);
    if (captures.length === 0) return '__VAR__';
    if (captures.length === 1) return `${captures[0]}__VAR__`;
    if (captures.length === 2) return `${captures[0]}__VAR__${captures[1]}`;
    console.log(
      'Warning: More than 2 captures in Value Cleaner given to Vitest CLI Output Serializer.',
    );
    return '__VAR__';
  };

  return cleaners.reduce((value, cleaner) => {
    if (cleaner instanceof RegExp) {
      return value.replaceAll(cleaner, regexpMatchReplacer);
    }
    return cleaner(value);
  }, value);
};

// ------------------------------
// Serializer
// ------------------------------

const test = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return variableReplacements.some(replacement => replacement.pattern.test(value));
  }
  if (isCleanable(value)) {
    return test(value.value);
  }
  if (isPromiseSettledFulfilled(value)) {
    return test(value.value);
  }
  if (isPromiseSettledRejected(value)) {
    return test(value.reason);
  }
  return isExecaError(value);
};

/**
 * @remarks The `value` parameter is only type-safe by an implementation of
 * the `test` function which only returns true for matching types of values.
 */
const serialize = (value: Value): string => {
  const text = serialize_({
    value,
    valueCleaners: CliOutputSnapshot.valueCleaners,
  });
  return text + newLine + endDivider;
};

const serialize_ = ({
  value,
  valueCleaners,
}: {
  value: Value;
  valueCleaners: Cleaner[];
}): string => {
  if (isCleanable(value)) {
    const text = serialize_({
      value: value.value,
      valueCleaners: [...valueCleaners, value.clean],
    });
    return text;
  }

  if (isPromiseSettledFulfilled(value)) {
    let text = serialize_({ value: value.value, valueCleaners }) + newLine;
    text += sectionDivider('promise') + newLine;
    text += 'fulfilled';
    return text;
  }

  if (isPromiseSettledRejected(value)) {
    let text = serialize_({ value: value.reason, valueCleaners }) + newLine;
    text += sectionDivider('promise') + newLine;
    text += 'rejected';
    return text;
  }

  //
  // Scalar Cases (non-recursing)
  //
  // When running cleaners, run generic one first so that value cleaners
  // do not have to worry about ANSI codes.
  //

  if (typeof value === 'string') {
    let text = '';
    text += heading('CLI SUCCESS OUTPUT') + newLine;

    text += sectionDivider('stdout') + newLine;
    text += applyValueCleaners(valueCleaners, generalClean(value));

    return text;
  }

  if (isExecaError(value)) {
    let text = '';
    text += heading('CLI FAILURE OUTPUT') + newLine;

    text += sectionDivider('exitCode') + newLine;
    text += value.exitCode + newLine;

    text += sectionDivider('stderr') + newLine;
    text += applyValueCleaners(valueCleaners, generalClean(value.stderr || '__NONE__')) + newLine;

    text += sectionDivider('stdout') + newLine;
    text += applyValueCleaners(valueCleaners, generalClean(value.stdout || '__NONE__'));

    return text;
  }

  return String(applyValueCleaners(valueCleaners, generalClean(value)));
};

/**
 * Strip ANSI codes and mask generally known variables.
 */
const generalClean = (value: string) => {
  // We strip ANSI codes because their output can vary by platform (e.g. between macOS and GH CI linux-based runner)
  // and we don't care enough about CLI output styling to fork our snapshots for it.
  value = stripAnsi(value);
  for (const replacement of variableReplacements) {
    value = value.replaceAll(replacement.pattern, replacement.mask);
  }
  return value;
};

const variableReplacements = [
  {
    pattern: /("reference": "|"requestId": "|"https?:\/\/)[^"]+/gi,
    mask: '$1__ID__',
  },
  {
    pattern: /"https?:\/\/[^"]+/gi,
    mask: '"__URL__',
  },
  {
    pattern: /(Reference: )[^ ]+/gi,
    mask: '$1__ID__',
  },
  {
    pattern: /(https?:\/\/)[^\n ]+/gi,
    mask: '$1__URL__',
  },
];

// ------------------------------
// Type Guards
// ------------------------------

/**
 * The esm2cjs execa package we are using is not exporting the error class, so use this.
 */
const isExecaError = (value: unknown): value is ExecaError => {
  // @ts-expect-error
  return typeof value.exitCode === 'number';
};

const isPromiseSettledRejected = (value: unknown): value is PromiseRejectedResult => {
  return (
    typeof value === 'object' && value !== null && 'status' in value && value.status === 'rejected'
  );
};

const isPromiseSettledFulfilled = (value: unknown): value is PromiseFulfilledResult<unknown> => {
  return (
    typeof value === 'object' && value !== null && 'status' in value && value.status === 'fulfilled'
  );
};

// ------------------------------
// Text Helpers
// ------------------------------

const width = 50;
const newLine = '\n';

const heading = (title: string) => {
  const char = ':';
  const gap = ' ';
  const borderSize = Math.max(0, width - title.length - gap.length * 2);
  const borderSizeHalf = borderSize ? Math.round(borderSize / 2) : 0;
  const borderHalf = char.repeat(borderSizeHalf);
  return `${borderHalf}${gap}${title}${gap}${borderHalf}`;
};

const sectionDivider = (title: string) => {
  const char = '-';
  const charEnd = ':';
  const dividerSize = Math.max(0, width - title.length - 1);
  const divider = char.repeat(dividerSize) + charEnd;
  return `${title}${divider}`;
};

const endDivider = ':'.repeat(width);

// ------------------------------
// Generic Helpers
// ------------------------------

const identity = <T>(value: T): T => value;

// ------------------------------
// Interface
// ------------------------------

export namespace CliOutputSnapshot {
  export const serializer: SnapshotSerializer = {
    test,
    serialize,
  };

  /**
   * A list of cleaners that will be applied to all values before they are snapshotted.
   *
   * Any cleaners you add here will apply to all snapshots in your test file.
   *
   * The value will be cleaned with the general cleaner first. So for example ANSI codes will have been stripped already.
   *
   * A cleaner can be a RegExp instance or an arbitrary function that receives and returns a string.
   *
   * #### RegExp Cleaners
   * When using RegExps, note the following.
   *
   * With regards to captured groups:
   *
   * String method `.replaceAll` is used so your RegExp MUST be using `g` flag.
   *
   * With regards to flags:
   * - 0 captures: Replace with `__VAR__`
   * - 1 capture: Replace with `$1__VAR__`
   * - 2 captures: Replace with `$1__VAR__$2`
   * - 3+ captures: Replace with `__VAR__` and log a warning. (Don't do this.)
   */
  export const valueCleaners: Cleaner[] = [];

  /**
   * Wrap a value with a cleaner for just that value.
   *
   * For details about cleaners, see {@link valueCleaners}.
   */
  export const withCleaner = (
    value: ValueSansCleanable,
    valueClean: Cleaner,
  ): Cleanable<ValueSansCleanable> => {
    return {
      value,
      clean: valueClean,
    };
  };
}
