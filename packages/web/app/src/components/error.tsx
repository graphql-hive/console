import { useEffect } from 'react';
import { LogOutIcon } from 'lucide-react';
import { useSessionContext } from 'supertokens-auth-react/recipe/session';
import { Button } from '@/components/ui/button';
import { captureException, flush } from '@sentry/react';
import { useRouter } from '@tanstack/react-router';

export const commonErrorStrings = {
  reported: 'This error was reported automatically to our technical support team.',
  track: 'To share additional details with us, contact our support team',
  link: 'here',
};

/** Check if an error is a chunk/module load failure from a stale deployment. */
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    // Chrome/Edge: failed dynamic import()
    error.message.includes('Failed to fetch dynamically imported module') ||
    // Safari/Firefox: failed dynamic import()
    error.message.includes('Importing a module script failed') ||
    // Webpack-style chunk errors (unlikely with Vite, but defensive)
    error.name === 'ChunkLoadError'
  );
}

export function ErrorComponent(props: { error: any; message?: string }) {
  const router = useRouter();
  const session = useSessionContext();

  useEffect(() => {
    // Use sessionStorage to track whether we've already tried reloading.
    // Since this is a client-rendered SPA, a single reload fetches fresh HTML
    // with all correct chunk references — one reload is enough for the entire
    // app. The flag prevents an infinite reload loop if the error persists
    // (e.g. the deployment itself is broken, or it's a network issue).
    if (isChunkLoadError(props.error) && !sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1');
      // Reload to fetch fresh HTML with correct chunk references.
      window.location.reload();
      return;
    }
    // If we already reloaded once and the error persists, the flag is
    // cleared on successful app boot in main.tsx, so no need to remove
    // it here. Fall through to show the error page + report to Sentry.

    captureException(props.error);
    void flush(2000);
  }, []);

  const isLoggedIn = !session.loading && session.doesSessionExist;

  return (
    <div className="flex size-full items-center justify-center">
      {isLoggedIn ? (
        <Button
          variant="outline"
          onClick={() =>
            router.navigate({
              to: '/logout',
            })
          }
          className="absolute right-6 top-6"
        >
          <LogOutIcon className="mr-2 size-4" /> Sign out
        </Button>
      ) : null}
      <div className="flex max-w-[960px] flex-col items-center gap-x-6 sm:flex-row">
        <img src="/images/figures/connection.svg" alt="Ghost" className="block size-[200px]" />
        <div className="grow text-center sm:text-left">
          <h1 className="text-xl font-semibold">
            {props.message || 'Oops, something went wrong.'}
          </h1>
          <div className="mt-2">
            <div className="text-sm">
              <p>{commonErrorStrings.reported}</p>
              <p>
                {commonErrorStrings.track}{' '}
                <Button variant="link" className="h-auto p-0" asChild>
                  <a href="mailto:support@graphql-hive.com">{commonErrorStrings.link}</a>
                </Button>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
