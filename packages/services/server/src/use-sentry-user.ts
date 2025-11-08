import type { Plugin } from '@envelop/types';
import * as Sentry from '@sentry/node';

export function extractUserId(context?: { user?: { betterAuthUserId: string } }) {
  const betterAuthUserId = context?.user?.betterAuthUserId;

  return betterAuthUserId ?? null;
}

export const useSentryUser = (): Plugin<{
  user: any;
}> => {
  return {
    onExecute({ args }) {
      const id = extractUserId(args.contextValue);

      if (id) {
        Sentry.configureScope(scope => {
          scope.setUser({
            id,
          });
        });
      }
    },
  };
};
