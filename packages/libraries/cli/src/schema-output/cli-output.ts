import { tb } from '../helpers/typebox/__';
import { success } from './success';

export const CLIOutputFile = success({
  __typename: tb.Literal('CLIOutputFile'),
  path: tb.String(),
});

export const CLIOutputStdout = success({
  __typename: tb.Literal('CLIOutputStdout'),
  content: tb.String(),
});
