import * as Sentry from '@sentry/node';
import type { Span } from '@sentry/types';

export type SentryContext = Parameters<Span['startChild']>[0] & {
  captureException?: boolean;
};

export function sentry(name: string, addToContext?: (...args: any[]) => SentryContext): MethodDecorator {
  return function sentryDecorator(_target, _prop, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function wrappedWithSentry(this: any, ...args: any[]) {
      let context = {
        op: name,
      };

      const lastArgument = args.length > 0 ? (args[args.length - 1] as Span) : null;
      const passedSpan = lastArgument && 'spanId' in lastArgument ? lastArgument : null;

      if (addToContext) {
        context = {
          ...addToContext(...args),
          ...context,
        };
      }

      const parentSpan = passedSpan ?? Sentry.getCurrentHub().getScope()?.getSpan();
      const span = parentSpan?.startChild(
        typeof context === 'string'
          ? {
              op: context,
            }
          : context
      );

      if (!span) {
        return (originalMethod as any).apply(this, args);
      }

      const argsWithoutSpan = passedSpan ? args.slice(0, args.length - 1) : args;

      return ((originalMethod as any).apply(this, argsWithoutSpan.concat(span)) as Promise<any>).then(
        result => {
          span.finish();
          return Promise.resolve(result);
        },
        error => {
          Sentry.captureException(error);
          span.setStatus('internal_error');
          span.finish();
          return Promise.reject(error);
        }
      );
    } as any;
  };
}
