import { Traces } from '../providers/traces';
import type { TraceResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "TraceMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const Trace: TraceResolvers = {
  /* Implement Trace resolver logic here */
  clientName(trace) {
    return trace.clientName;
  },
  clientVersion(trace) {
    return trace.clientVersion;
  },
  httpStatusCode(trace) {
    return trace.httpStatusCode;
  },
  id(trace) {
    return trace.traceId;
  },
  operationName(trace) {
    return trace.graphqlOperationName;
  },
  operationType(trace) {
    return trace.graphqlOperationType;
  },
  spans(trace, _arg, { injector }) {
    return injector.get(Traces).findSpansForTraceId(trace.traceId, trace.targetId);
  },
  subgraphs(trace) {
    return trace.subgraphNames;
  },
  success(trace) {
    console.log('BRRR BRRR', trace);
    return (
      (trace.graphqlErrorCodes?.length ?? 0) === 0 &&
      trace.graphqlErrorCount === 0 &&
      (trace.httpStatusCode.startsWith('2') || trace.httpStatusCode.startsWith('3'))
    );
  },
  operationHash: async trace => {
    return trace.graphqlOperationHash;
  },
};
