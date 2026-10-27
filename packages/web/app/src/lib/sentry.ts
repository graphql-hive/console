import type { init } from '@sentry/react';

/** @sentry/react re-exports no event types, so derive the beforeSend event from init's options. */
export type ErrorEvent = Parameters<NonNullable<Parameters<typeof init>[0]['beforeSend']>>[0];

export const sentryIgnoreErrors: Array<string | RegExp> = [
  // Suppress specific monaco editor internal errors
  "Failed to execute 'setStart' on 'Range'",
  "Failed to execute 'setEnd' on 'Range'",
  /TextModel got disposed/,
  // Monaco's Safari clipboard workaround cancels its pending DeferredPromise on every
  // click/keydown without a rejection handler, surfacing as an unhandled "Canceled" rejection.
  // Anchored so messages that merely contain the word are still reported.
  /^Canceled$/,
  // Stale chunk errors after deployments, handled by the auto-reload in main.tsx
  /Failed to fetch dynamically imported module/,
  /Importing a module script failed/,
];

function isMonacoFrame(filename: string | undefined): boolean {
  if (!filename) return false;
  return (
    filename.includes('monaco-editor') ||
    // the laboratory build inlines Monaco into its own editor.api chunk
    filename.includes('laboratory/dist/editor.api')
  );
}

/** Prefix exception messages with `[Monaco]` when any stack frame comes from the Monaco bundle. */
export function tagMonacoErrors(event: ErrorEvent): ErrorEvent {
  const isMonacoError = event.exception?.values?.some(exception =>
    exception.stacktrace?.frames?.some(frame => isMonacoFrame(frame.filename)),
  );

  if (isMonacoError) {
    for (const exception of event.exception?.values ?? []) {
      exception.value &&= `[Monaco] ${exception.value}`;
    }
  }

  return event;
}
