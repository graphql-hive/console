import type { Logger } from '@graphql-hive/pubsub';
import type { ServiceLogger } from '@hive/service-common';

export function bridgeFastifyLogger(logger: Logger): ServiceLogger {
  return logger as unknown as ServiceLogger;
}
