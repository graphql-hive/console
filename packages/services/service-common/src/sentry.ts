import { hostname } from 'os';
import {
  contextLinesIntegration,
  dedupeIntegration,
  extraErrorDataIntegration,
} from '@sentry/integrations';
import { httpIntegration, init, linkedErrorsIntegration } from '@sentry/node';

/**
 * Initialize Sentry SDK with our commong configuration options.
 */
export function sentryInit(args: {
  dist: string;
  enabled: boolean;
  environment?: string;
  dsn: string;
  release: string;
}) {
  return init({
    serverName: hostname(),
    enabled: args.enabled,
    environment: args.environment,
    dsn: args.dsn,
    release: args.release,
    integrations: [
      httpIntegration({ tracing: false }),
      contextLinesIntegration({
        frameContextLines: 0,
      }),
      linkedErrorsIntegration(),
      extraErrorDataIntegration({
        depth: 2,
      }),
      dedupeIntegration(),
    ],
    maxBreadcrumbs: 10,
    defaultIntegrations: false,
    autoSessionTracking: false,
    beforeSend(event) {
      if (event.message) {
        event.message = scrubBasicAuth(event.message);
      }

      if (event.exception?.values) {
        event.exception.values = event.exception.values.map(value => ({
          ...value,
          value: value.value ? scrubBasicAuth(value.value) : value.value,
        }));
      }

      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = scrubBasicAuth(breadcrumb.message);
      }
      return breadcrumb;
    },
  });
}

function scrubBasicAuth(value: string) {
  return value.replace(/\bhttps?:\/\/([^:@\/]+):([^@\/]+)@/gi, 'https://[Filtered]:[Filtered]@');
}
