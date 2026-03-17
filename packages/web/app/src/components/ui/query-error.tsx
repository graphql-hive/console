import { ReactElement } from 'react';
import cookies from 'js-cookie';
import { LogOutIcon } from 'lucide-react';
import { CombinedError } from 'urql';
import { commonErrorStrings } from '@/components/error';
import { Button } from '@/components/ui/button';
import { LAST_VISITED_ORG_KEY } from '@/constants';
import { Link, useRouter } from '@tanstack/react-router';

export function QueryError({
  error,
  showError,
  organizationSlug,
  showLogoutButton = true,
}: {
  error: CombinedError;
  showError?: boolean;
  organizationSlug: string | null;
  showLogoutButton?: boolean;
}): ReactElement {
  const router = useRouter();
  const requestId =
    error &&
    'response' in error &&
    error?.response?.headers?.get('x-request-id')?.split(',')[0].trim();

  cookies.remove(LAST_VISITED_ORG_KEY);

  const containsUnexpectedError = error.message?.includes('Unexpected error');
  const isNetworkError = !!error.networkError;
  const isExpectedError = !isNetworkError && !containsUnexpectedError;
  const shouldShowError = typeof showError === 'boolean' ? showError : isExpectedError;

  return (
    <div className="flex size-full items-center justify-center">
      {showLogoutButton && (
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
      )}
      <div className="flex max-w-[960px] flex-col items-center gap-x-6 sm:flex-row">
        <img src="/images/figures/connection.svg" alt="Ghost" className="block size-[200px]" />
        <div className="grow text-center sm:text-left">
          <h1 className="text-xl font-semibold">Oops, something went wrong.</h1>
          <div className="mt-2">
            {shouldShowError ? (
              <div className="text-sm">{error.graphQLErrors?.[0].message}</div>
            ) : (
              <div className="text-sm">
                <p>{commonErrorStrings.reported}</p>
                <p>
                  {commonErrorStrings.track}{' '}
                  {organizationSlug ? (
                    <Button variant="link" className="h-auto p-0" asChild>
                      <Link to="/$organizationSlug/view/support" params={{ organizationSlug }}>
                        {commonErrorStrings.link}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="link" className="h-auto p-0" asChild>
                      <a href="mailto:support@graphql-hive.com">{commonErrorStrings.link}</a>
                    </Button>
                  )}
                  .
                </p>
              </div>
            )}

            {requestId ? (
              <div className="mt-6 text-xs">
                <div className="text-neutral-11 inline-flex items-center">
                  <div className="rounded-l-sm bg-yellow-500/10 p-2">Error ID</div>
                  <div className="rounded-r-sm bg-yellow-500/5 p-2">{requestId}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
