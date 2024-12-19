import type { SnapshotSerializer } from 'vitest';
import { ExecaError } from '@esm2cjs/execa';
import { ExecError } from '../../../testkit/cli';

export const path: SnapshotSerializer = {
  test: (value: unknown) => {
    if (typeof value === 'string') {
      return variableReplacements.some(replacement => replacement.pattern.test(value));
    }
    return value instanceof ExecError || isExecaError(value);
  },
  serialize: (value: unknown) => {
    if (typeof value === 'string') {
      return maskVariables(value);
    }
    if (value instanceof ExecError || isExecaError(value)) {
      let valueSerialized = '';
      valueSerialized += '--------------------------------------------exitCode:\n';
      valueSerialized += value.exitCode;
      valueSerialized += '\n\n--------------------------------------------stderr:\n';
      valueSerialized += maskVariables(value.stderr);
      valueSerialized += '\n\n--------------------------------------------stdout:\n';
      valueSerialized += maskVariables(value.stdout);
      return valueSerialized;
    }
    return String(value);
  },
};

const variableReplacements = [
  {
    pattern: /(https?:\/\/)[^ ]+/gi,
    mask: '$1__PATH__',
  },
  {
    pattern: /\/.*(\/cli\/bin\/run)/gi,
    mask: '__PATH__$1',
  },
];

const maskVariables = (value: string) => {
  for (const replacement of variableReplacements) {
    value = value.replace(replacement.pattern, replacement.mask ?? '__REDACTED__');
  }
  return value;
};

const isExecaError = (value: unknown): value is ExecaError => {
  // @ts-expect-error the esm2cjs execa package we are using is not exporting the error class.
  return typeof value.exitCode === 'number';
};
