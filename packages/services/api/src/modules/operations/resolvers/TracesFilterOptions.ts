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
  httpHost: async ({ loader }, { top }) => {
    return loader.load({
      key: 'http_url',
      columnExpression: 'http_host',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  httpMethod: async ({ loader }, { top }, { injector }) => {
    return loader.load({
      key: 'http_method',
      columnExpression: 'http_method',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  httpRoute: async ({ loader }, { top }, { injector }) => {
    return loader.load({
      key: 'http_route',
      columnExpression: 'http_route',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  httpStatusCode: async ({ loader }, { top }) => {
    return loader.load({
      key: 'http_status_code',
      columnExpression: 'http_status_code',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  httpUrl: async ({ loader }, { top }) => {
    return loader.load({
      key: 'http_url',
      columnExpression: 'http_url',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  operationName: async ({ loader }, { top }) => {
    return loader.load({
      key: 'graphql_operation_name',
      columnExpression: 'graphql_operation_name',
      limit: top ?? 5,
      arrayJoinColumn: null,
    });
  },
  operationType: async ({ loader }) => {
    return loader.load({
      key: 'graphql_operation_type',
      columnExpression: 'graphql_operation_type',
      limit: null,
      arrayJoinColumn: null,
    });
  },
  subgraphs: async ({ loader }, { top }) => {
    return loader.load({
      key: 'subgraph_names',
      columnExpression: 'value',
      limit: top ?? 5,
      arrayJoinColumn: 'subgraph_names',
    });
  },
  success: async ({ loader }) => {
    return loader
      .load({
        key: 'success',
        columnExpression:
          'if((toUInt16OrZero(http_status_code) >= 200 AND toUInt16OrZero(http_status_code) < 300), true, false)',
        limit: null,
        arrayJoinColumn: null,
      })
      .then(data => data.map(({ value, count }) => ({ value: value ? true : false, count })));
  },
  errorCode: async ({ loader }, { top }) => {
    return loader.load({
      key: 'errorCode',
      columnExpression: 'value',
      limit: top ?? 10,
      arrayJoinColumn: 'graphql_error_codes',
    });
  },
};
