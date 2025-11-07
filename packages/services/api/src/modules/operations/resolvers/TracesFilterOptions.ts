import type { TracesFilterOptionsResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TracesFilterOptionsMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const TracesFilterOptions: TracesFilterOptionsResolvers = {
  /* Implement TracesFilterOptions resolver logic here */
  httpHost(loader, { top }) {
    return loader.httpHost(top ?? null);
  },
  httpMethod(loader, { top }) {
    return loader.httpMethod(top ?? null);
  },
  httpRoute(loader, { top }) {
    return loader.httpRoute(top ?? null);
  },
  httpStatusCode(loader, { top }) {
    return loader.httpStatusCode(top ?? null);
  },
  httpUrl(loader, { top }) {
    return loader.httpUrl(top ?? null);
  },
  operationName(loader, { top }) {
    return loader.operationName(top ?? null);
  },
  operationType(loader) {
    return loader.operationType();
  },
  subgraphs(loader, { top }) {
    return loader.subgraphs(top ?? null);
  },
  success(loader) {
    return loader.success();
  },
  errorCode(loader, { top }) {
    return loader.errorCode(top ?? null);
  },
  clientName(loader, { top }) {
    return loader.clientName(top ?? null);
  },
};
