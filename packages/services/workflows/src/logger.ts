import { Logger as GraphileLogger, type LogLevel as GraphileLogLevel } from 'graphile-worker';
import type { Logger } from '@graphql-hive/logger';
import { ServiceLogger } from '@hive/service-common';

function logLevel(level: GraphileLogLevel) {
  switch (level) {
    case 'warning':
      return 'warn' as const;
    case 'info': {
      return 'info' as const;
    }
    case 'debug': {
      return 'debug' as const;
    }
    case 'error': {
      return 'error' as const;
    }
  }

  return 'info';
}

/**
 * Bridges Hive Logger to Graphile Logger
 */
export function bridgeGraphileLogger(logger: Logger) {
  return new GraphileLogger(_scope => (level, message, _meta) => {
    logger[logLevel(level)](message);
  });
}

export function bridgeFastifyLogger(logger: Logger): ServiceLogger {
  return logger as unknown as ServiceLogger;
}
