import { T } from '../helpers/typebox/__';
import { success } from './output-data-type';

export const SuccessOutputFile = success('SuccessOutputFile', {
  data: {
    path: T.String(),
    bytes: T.Number(),
  },
});

export const SuccessOutputStdout = success('SuccessOutputStdout', {
  data: {
    content: T.String(),
  },
  text(_, data) {
    return data.content;
  },
});
