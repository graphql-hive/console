import { Logger as GraphileLogger, type LogLevel as GraphileLogLevel } from 'graphile-worker';

export type Logger = {
  error(msg: string, ...interpol: unknown[]): void;
  warn(msg: string, ...interpol: unknown[]): void;
  info(msg: string, ...interpol: unknown[]): void;
  debug(msg: string, ...interpol: unknown[]): void;
};

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

export function bridgeGraphileLogger(logger: Logger) {
  return new GraphileLogger(_scope => (level, message, _meta) => {
    logger[logLevel(level)](message);
  });
}
