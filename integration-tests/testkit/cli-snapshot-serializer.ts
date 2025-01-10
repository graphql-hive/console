import stripAnsi from 'strip-ansi';
import type { SnapshotSerializer } from 'vitest';
import { ExecaError } from '@esm2cjs/execa';

const test = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return variableReplacements.some(replacement => replacement.pattern.test(value));
  }
  if (isPromiseSettledFulfilled(value)) {
    return test(value.value);
  }
  if (isPromiseSettledRejected(value)) {
    return test(value.reason);
  }
  return isExecaError(value);
};

type Value = string | ExecaError | PromiseSettledResult<string | ExecaError>;

/**
 * @remarks The `value` parameter is only type-safe by an implementation of
 * the `test` function which only returns true for these types of values.
 */
const serialize = (value: Value): string => {
  const text = serialize_(value);
  return text + newLine + endDivider;
};

const serialize_ = (value: Value): string => {
  if (isPromiseSettledFulfilled(value)) {
    return serialize_(value.value) + newLine + sectionDivider('promise') + newLine + 'fulfilled';
  }

  if (isPromiseSettledRejected(value)) {
    return serialize_(value.reason) + newLine + sectionDivider('promise') + newLine + 'rejected';
  }

  if (typeof value === 'string') {
    let text = '';
    text += heading('CLI SUCCESS OUTPUT') + newLine;

    text += sectionDivider('stdout') + newLine;
    text += clean(value);

    return text;
  }

  if (isExecaError(value)) {
    let text = '';
    text += heading('CLI FAILURE OUTPUT') + newLine;

    text += sectionDivider('exitCode') + newLine;
    text += value.exitCode + newLine;

    text += sectionDivider('stderr') + newLine;
    text += clean(value.stderr || '__NONE__') + newLine;

    text += sectionDivider('stdout') + newLine;
    text += clean(value.stdout || '__NONE__');

    return text;
  }

  return String(value);
};

export const cliOutputSnapshotSerializer: SnapshotSerializer = {
  test,
  serialize,
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

/**
 * Strip ANSI codes and mask variables.
 */
const clean = (value: string) => {
  // We strip ANSI codes because their output can vary by platform (e.g. between macOS and GH CI linux-based runner)
  // and we don't care enough about CLI output styling to fork our snapshots for it.
  value = stripAnsi(value);
  for (const replacement of variableReplacements) {
    value = value.replaceAll(replacement.pattern, replacement.mask);
  }
  return value;
};

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
