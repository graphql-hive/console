import { hostname } from 'os';
import {
  dedupeIntegration,
  extraErrorDataIntegration,
  httpIntegration,
  init,
  linkedErrorsIntegration,
} from '@sentry/node';
import { scrubBasicAuth } from './scrub';

/**
 * Initialize Sentry SDK with our common configuration options.
 *
 * Error capture only: tracing stays with our own OpenTelemetry SDK, so Sentry must not
 * register an OTel provider, inject trace headers, or hook the module loader.
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
    dist: args.dist,
    release: args.release,
    integrations: [
      httpIntegration({
        spans: false,
        breadcrumbs: true,
        // OpenTelemetry already propagates trace context on outgoing requests.
        tracePropagation: false,
        sessions: false,
      }),
      linkedErrorsIntegration(),
      extraErrorDataIntegration({
        depth: 2,
        // linkedErrorsIntegration already reports the cause chain as linked exceptions.
        captureErrorCause: false,
      }),
      dedupeIntegration(),
    ],
    maxBreadcrumbs: 10,
    defaultIntegrations: false,
    // captureMessage events keep grouping by message, as they did before v11.
    attachStacktrace: false,
    // Services ship as single-file bundles without node_modules, where the loader hook
    // cannot resolve its targets; OpenTelemetry instruments third-party libraries anyway.
    enableRuntimeChannelInjection: false,
    // Nothing from the incoming request reaches events; only the user/tags we set explicitly.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
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
