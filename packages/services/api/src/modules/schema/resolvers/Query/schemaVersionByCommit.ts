import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaVersionByCommit: NonNullable<QueryResolvers['schemaVersionByCommit']> = async (
  _,
  args,
  { injector },
) => {
  return injector.get(SchemaManager).getSchemaVersionByCommit({
    commit: args.commit,
    target: args.target ?? null,
  });
};
