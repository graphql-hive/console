import { SchemaRevisionStore } from '../providers/schema-revision-store';
import type { CompositeSchemaResolvers } from './../../../__generated__/types';

export const CompositeSchema: CompositeSchemaResolvers = {
  __isTypeOf: obj => {
    return obj.kind === 'composite' && obj.action === 'PUSH';
  },
  service: schema => {
    return schema.service_name;
  },
  source: schema => {
    return schema.sdl;
  },
  url: schema => {
    return schema.service_url;
  },
  revision: (schema, _, { injector }) =>
    schema.schemaRevisionId
      ? injector.get(SchemaRevisionStore).getById(schema.schemaRevisionId)
      : null,
};
