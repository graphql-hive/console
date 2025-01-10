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

const applyValueCleaner = (cleaner: Cleaner, value: string) => {
  const regexpMatchReplacer = (_: string, ...args: any[]) => {
    const captures = args.slice(0, -2);
    if (captures.length === 0) return '__VAR__';
    if (captures.length === 1) return `${captures[0]}__VAR__`;
    if (captures.length === 2) return `${captures[0]}__VAR__${captures[1]}`;
    console.log(
      'Warning: More than 2 captures in Value Cleaner given to Vitest CLI Output Serializer.',
    );
    return '';
  };

  if (cleaner instanceof RegExp) {
    return value.replaceAll(cleaner, regexpMatchReplacer);
  }

  return cleaner(value);
};

/**
 * Wrap the value with a cleaner that will be run before snapshotting the text value.
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
  const defaultValueClean = identity;
  const text = serialize_({
    value,
    valueClean: defaultValueClean,
  });
  return text + newLine + endDivider;
};

const serialize_ = (parameters: { value: Value; valueClean: Cleaner }): string => {
  const { value, valueClean } = parameters;

  if (isCleanable(value)) {
    const text = serialize_({
      value: value.value,
      valueClean: value.clean,
    });
    return text;
  }

  if (isPromiseSettledFulfilled(value)) {
    let text = serialize_({ value: value.value, valueClean }) + newLine;
    text += sectionDivider('promise') + newLine;
    text += 'fulfilled';
    return text;
  }

  if (isPromiseSettledRejected(value)) {
    let text = serialize_({ value: value.reason, valueClean }) + newLine;
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
    text += applyValueCleaner(valueClean, generalClean(value));

    return text;
  }

  if (isExecaError(value)) {
    let text = '';
    text += heading('CLI FAILURE OUTPUT') + newLine;

    text += sectionDivider('exitCode') + newLine;
    text += value.exitCode + newLine;

    text += sectionDivider('stderr') + newLine;
    text += applyValueCleaner(valueClean, generalClean(value.stderr || '__NONE__')) + newLine;

    text += sectionDivider('stdout') + newLine;
    text += applyValueCleaner(valueClean, generalClean(value.stdout || '__NONE__'));

    return text;
  }

  return String(value);
};

export const cliOutputSnapshotSerializer: SnapshotSerializer = {
  test,
  serialize,
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
