import type { TracesFilterValuesResolvers } from './../../../__generated__/types';

export const TracesFilterValues: TracesFilterValuesResolvers = {
  operationNames: loader => loader.load('operationNames'),
  clientNames: loader => loader.load('clientNames'),
  subgraphNames: loader => loader.load('subgraphNames'),
  errorCodes: loader => loader.load('errorCodes'),
  httpStatusCodes: loader => loader.load('httpStatusCodes'),
  httpMethods: loader => loader.load('httpMethods'),
  httpHosts: loader => loader.load('httpHosts'),
  httpRoutes: loader => loader.load('httpRoutes'),
  httpUrls: loader => loader.load('httpUrls'),
};
