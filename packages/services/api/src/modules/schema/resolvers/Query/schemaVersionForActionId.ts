import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const schemaVersionForActionId: NonNullable<
  QueryResolvers['schemaVersionForActionId']
> = async (_, args, { injector }) => {
  return injector.get(SchemaManager).getSchemaVersionByActionId({
    actionId: args.actionId,
    target: args.target ?? null,
  });
};
