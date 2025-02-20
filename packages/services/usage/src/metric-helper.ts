import * as Sentry from '@sentry/node';
import { httpRequestHandlerDuration, parseReportDuration } from './metrics';

export function measureParsing<T>(fn: () => T, version: 'v1' | 'v2'): T {
  const stop = parseReportDuration.startTimer({ version });
  try {
    const result = fn();

    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    stop();
  }
}

export function measureHandler<$Req, $Res>(fn: (_req: $Req, _res: $Res) => Promise<void>) {
  return async function (req: $Req, res: $Res) {
    const stop = httpRequestHandlerDuration.startTimer();

    try {
      await fn(req, res);
    } finally {
      stop();
    }
  };
}
