import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const latestValidVersion: NonNullable<QueryResolvers['latestValidVersion']> = async (
  _,
  args,
  { injector, session },
) => {
  let targetId: string;

  if (args.target) {
    targetId = await injector.get(IdTranslator).translateTargetId(args.target);
  } else {
    const selector = session.getLegacySelector();
    targetId = selector.targetId;
  }

  const target = await injector.get(TargetManager).getTargetById({ targetId });
  return injector.get(SchemaManager).getMaybeLatestValidVersion(target);
};
