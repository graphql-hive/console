import { FailureGeneric } from './result/failure';
import { SuccessGeneric } from './result/success';

export type Result = FailureGeneric | SuccessGeneric;
export * as Result from './result/_';
export {
  defineFailure,
  defineSuccess,
  Definition,
  InferFailureResult,
  InferSuccessResult,
  InferFailureResultInit,
  InferSuccessResultInit,
} from './definition';
export * as Types from './types/_';
