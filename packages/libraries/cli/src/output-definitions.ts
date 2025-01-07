import { T } from './helpers/typebox/__';
import { Output } from './output/__';

export namespace OutputDefinitions {
  export const SuccessOutputStdout = Output.defineSuccess('SuccessOutputStdout', {
    data: {
      content: T.String(),
    },
    text(_, data) {
      return data.content;
    },
  });
  export const SuccessOutputFile = Output.defineSuccess('SuccessOutputFile', {
    data: {
      path: T.String(),
      bytes: T.Number(),
    },
  });
}
