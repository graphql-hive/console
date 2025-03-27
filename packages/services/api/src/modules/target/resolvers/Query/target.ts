import { TargetManager } from '../../providers/target-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const target: NonNullable<QueryResolvers['target']> = async (
  _,
  { reference },
  { injector },
) => {
  return injector.get(TargetManager).getTargetByReferenceInput(reference);
};
