import { captureException } from '@sentry/react';
import { LogRecord } from '../shared-types';

export function LogLine({ log }: { log: LogRecord }) {
  if ('type' in log && log.type === 'separator') {
    return <hr className="my-2 border-dashed border-current" />;
  }

  if ('level' in log && log.level in LOG_COLORS) {
    return (
      <div className={LOG_COLORS[log.level]}>
        {log.level}: {log.message}
        {log.line && log.column ? ` (${log.line}:${log.column})` : ''}
      </div>
    );
  }

  captureException(new Error('Unexpected log type in Preflight Script output'), {
    extra: { log },
  });
  return null;
}

const LOG_COLORS = {
  error: 'text-red-400',
  info: 'text-emerald-400',
  warn: 'text-yellow-400',
  log: 'text-gray-400',
};
