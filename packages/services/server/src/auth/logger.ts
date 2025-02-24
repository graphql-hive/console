import { ServiceLogger } from '@hive/service-common';

export function createRequestLogger(logger: ServiceLogger, headers?: Headers) {
  const reqId = headers?.get('x-request-id');

  if (reqId) {
    return logger.child({ reqId });
  }

  return logger;
}
