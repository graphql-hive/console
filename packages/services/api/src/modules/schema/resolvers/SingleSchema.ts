import { SchemaRevisionStore } from '../providers/schema-revision-store';
import type { SingleSchemaResolvers } from './../../../__generated__/types';

export const SingleSchema: SingleSchemaResolvers = {
  __isTypeOf: obj => {
    return obj.kind === 'single';
  },
  source: schema => {
    return schema.sdl;
  },
  revision: (schema, _, { injector }) =>
    schema.schemaRevisionId
      ? injector.get(SchemaRevisionStore).getById(schema.schemaRevisionId)
      : null,
};
