import { tb } from '../helpers/typebox/__';
import { FailureBase } from './failure';
import { SuccessBase } from './success';

export const OutputBase = tb.Union([SuccessBase, FailureBase]);
export type OutputBase = tb.Static<typeof OutputBase>;

export type OutputBaseTypesT = typeof SuccessBase | typeof FailureBase;
export type OutputBaseT = tb.Union<OutputBaseTypesT[]>;

export const output = <$Types extends OutputBaseTypesT[]>(...types: $Types): tb.Union<$Types> =>
  tb.Union(types) as any;
