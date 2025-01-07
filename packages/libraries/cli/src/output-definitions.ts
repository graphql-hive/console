import { Output } from './output/__';

export namespace OutputDefinitions {
  export const SuccessOutputStdout = Output.defineSuccess('SuccessOutputStdout', {
    data: Output.Types.OutputToStdout.properties,
    text(_, data) {
      return data.content;
    },
  });

  export const SuccessOutputFile = Output.defineSuccess('SuccessOutputFile', {
    data: Output.Types.OutputToFile.properties,
  });
}
