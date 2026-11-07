import { useEffect } from 'react';
import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button/button';
import { useSession } from '@/lib/auth/use-session';
import { isChunkLoadError, reloadOnChunkError } from '@/lib/chunk-error';
import * as shared from '@/styles/shared.css';
import { captureException, flush } from '@sentry/react';
import { useRouter } from '@tanstack/react-router';
import { errorStyles } from './error.css';

export const commonErrorStrings = {
  reported: 'This error was reported automatically to our technical support team.',
  track: 'To share additional details with us, contact our support team',
  link: 'here',
};

export function ErrorComponent(props: { error: any; message?: string }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    // If this is a stale chunk error, attempt a single reload to fetch fresh
    // HTML. reloadOnChunkError() handles the sessionStorage guard internally
    // to prevent infinite loops — see lib/chunk-error.ts for details.
    // If it doesn't reload (flag already set), fall through to report to Sentry.
    if (isChunkLoadError(props.error)) {
      reloadOnChunkError();
    }

    captureException(props.error);
    void flush(2000);
  }, [props.error]);

  const isLoggedIn = !session.loading && session.doesSessionExist;

  return (
    // `relative` so the sign-out button below sits in this block's corner: the error renders
    // inside a layout now, and an unpositioned `absolute` would put it over the header.
    <div className={errorStyles.root}>
      {isLoggedIn ? (
        <div className={errorStyles.signOut}>
          <Button
            variant="outline"
            onClick={() =>
              router.navigate({
                to: '/logout',
              })
            }
          >
            <LogOutIcon className={errorStyles.signOutIcon} /> Sign out
          </Button>
        </div>
      ) : null}
      <div className={errorStyles.body}>
        <img src="/images/figures/connection.svg" alt="Ghost" className={errorStyles.image} />
        <div className={errorStyles.text}>
          <h1 className={errorStyles.title}>{props.message || 'Oops, something went wrong.'}</h1>
          <div className={errorStyles.details}>
            <div className={shared.text.sm}>
              <p>{commonErrorStrings.reported}</p>
              <p>
                {commonErrorStrings.track}{' '}
                <Button variant="link" anchor={{ href: 'mailto:support@graphql-hive.com' }}>
                  {commonErrorStrings.link}
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
