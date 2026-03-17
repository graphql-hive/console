import stripAnsi from 'strip-ansi';
import type { SnapshotSerializer } from 'vitest';
import { ExecaError } from '@esm2cjs/execa';

export const cliOutputSnapshotSerializer: SnapshotSerializer = {
  test: (value: unknown) => {
    if (typeof value === 'string') {
      return variableReplacements.some(replacement => replacement.pattern.test(value));
    }
    return isExecaError(value);
  },
  serialize: (value: unknown) => {
    if (typeof value === 'string') {
      let valueSerialized = '';
      valueSerialized += ':::::::::::::::: CLI SUCCESS OUTPUT :::::::::::::::::\n';
      valueSerialized += '\nstdout--------------------------------------------:\n';
      valueSerialized += clean(value);
      return valueSerialized;
    }
    if (isExecaError(value)) {
      let valueSerialized = '';
      valueSerialized += ':::::::::::::::: CLI FAILURE OUTPUT :::::::::::::::\n';
      valueSerialized += 'exitCode------------------------------------------:\n';
      valueSerialized += value.exitCode;
      valueSerialized += '\nstderr--------------------------------------------:\n';
      valueSerialized += clean(value.stderr || '__NONE__');
      valueSerialized += '\nstdout--------------------------------------------:\n';
      valueSerialized += clean(value.stdout || '__NONE__');
      return valueSerialized;
    }
    return String(value);
  },
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
    pattern: /(Request ID:)[^)]+"/gi,
    mask: '$1 __REQUEST_ID__',
  },
  {
    pattern: /(https?:\/\/)[^\n ]+/gi,
    mask: '$1__URL__',
  },
  {
    pattern: /[ ]+\n/gi,
    mask: '\n',
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
