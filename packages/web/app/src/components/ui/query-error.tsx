import { ReactElement } from 'react';
import cookies from 'js-cookie';
import { LogOutIcon } from 'lucide-react';
import { CombinedError } from 'urql';
import { commonErrorStrings } from '@/components/error';
import { Button } from '@/components/ui/primitives/button/button';
import { LAST_VISITED_ORG_KEY } from '@/constants';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { Link, useRouter } from '@tanstack/react-router';
import { queryErrorStyles } from './query-error.css';

export function QueryError({
  error,
  showError,
  organizationSlug,
  showLogoutButton = true,
  className,
}: {
  error: CombinedError;
  showError?: boolean;
  organizationSlug: string | null;
  showLogoutButton?: boolean;
  className?: string;
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
    <div className={cn(queryErrorStyles.root, className)}>
      {showLogoutButton && (
        <div className={queryErrorStyles.signOut}>
          <Button
            variant="outline"
            onClick={() =>
              router.navigate({
                to: '/logout',
              })
            }
          >
            <LogOutIcon className={queryErrorStyles.signOutIcon} /> Sign out
          </Button>
        </div>
      )}
      <div className={queryErrorStyles.body}>
        <img src="/images/figures/connection.svg" alt="Ghost" className={queryErrorStyles.image} />
        <div className={queryErrorStyles.text}>
          <h1 className={queryErrorStyles.title}>Oops, something went wrong.</h1>
          <div className={queryErrorStyles.details}>
            {shouldShowError ? (
              <div className={shared.text.sm}>
                {error.graphQLErrors?.[0]?.message ?? error.message}
              </div>
            ) : (
              <div className={shared.text.sm}>
                <p>{commonErrorStrings.reported}</p>
                <p>
                  {commonErrorStrings.track}{' '}
                  {organizationSlug ? (
                    <Button
                      variant="link"
                      render={
                        <Link to="/$organizationSlug/view/support" params={{ organizationSlug }} />
                      }
                    >
                      {commonErrorStrings.link}
                    </Button>
                  ) : (
                    <Button variant="link" anchor={{ href: 'mailto:support@graphql-hive.com' }}>
                      {commonErrorStrings.link}
                    </Button>
                  )}
                  .
                </p>
              </div>
            )}

            {requestId ? (
              <div className={queryErrorStyles.requestId}>
                <div className={queryErrorStyles.requestIdRow}>
                  <div className={queryErrorStyles.requestIdLabel}>Error ID</div>
                  <div className={queryErrorStyles.requestIdValue}>{requestId}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
