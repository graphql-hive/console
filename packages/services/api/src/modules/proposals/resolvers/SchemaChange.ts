import type { SchemaChangeResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "SchemaChangeMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const SchemaChange: Pick<SchemaChangeResolvers, 'meta' | '__isTypeOf'> = {
  /* Implement SchemaChange resolver logic here */
  meta: ({ meta }, _arg, _ctx) => {
    /* SchemaChange.meta resolver is required because SchemaChange.meta and SchemaChangeMapper.meta are not compatible */
    return meta;
  },
};
