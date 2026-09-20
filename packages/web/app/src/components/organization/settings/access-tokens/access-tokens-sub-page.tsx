import { useState } from 'react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { graphql } from '@/gql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { AccessTokenCreatedDialog } from './access-token-created-dialog';
import { AccessTokensTable } from './access-tokens-table';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      allAccessTokens(first: 10) {
        ...AccessTokensTable_AccessTokenConnectionFragment
      }
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

export const enum CreateAccessTokenState {
  closed,
  open,
  /** show confirmation dialog to ditch draft state of new access token */
  closing,
}

export function AccessTokensSubPage(props: AccessTokensSubPageProps): React.ReactNode {
  const [query, refetchQuery] = useQuery({
    query: AccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
    requestPolicy: 'network-only',
  });

  const [createAccessTokenState, setCreateAccessTokenState] = useState<CreateAccessTokenState>(
    CreateAccessTokenState.closed,
  );
  // Bumped once the sheet has finished closing, so the next draft starts fresh without cutting
  // the exit transition short.
  const [createSession, setCreateSession] = useState(0);
  // The key can't be fetched again, so it becomes state the moment it arrives rather than waiting
  // for the sheet's exit; the created dialog opens over the closing sheet.
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const shownKey = useKeepPreviousData(createdKey ?? undefined, createdKey === null);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Organization Access Tokens"
        description={
          <>
            <p>
              Access Tokens are used for the Hive CLI, Hive Public GraphQL API and Hive Usage
              Reporting. Granular resource based access can be granted based on permissions.
            </p>
            <p>
              Here you can see, create and revoke access tokens issued within the whole organization
              (including project, personal and organization scoped) access tokens.
            </p>
          </>
        }
        docsLink={{
          href: '/schema-registry/management/access-tokens',
          text: 'Learn more about Access Tokens',
        }}
        sideContent={
          <>
            {query.data?.organization ? (
              <>
                {/* Outside the keyed sheet, so it is still there to take focus back on close. */}
                <Button
                  data-cy="organization-settings-access-tokens-create-new"
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
                >
                  Create new access token
                </Button>
                <CreateAccessTokenSheetContent
                  key={createSession}
                  open={createAccessTokenState !== CreateAccessTokenState.closed}
                  onOpenChange={isOpen => {
                    if (isOpen === false) {
                      setCreateAccessTokenState(CreateAccessTokenState.closing);
                      return;
                    }
                    setCreateAccessTokenState(CreateAccessTokenState.open);
                  }}
                  onOpenChangeComplete={isOpen => {
                    if (!isOpen) {
                      setCreateSession(s => s + 1);
                    }
                  }}
                  organization={query.data.organization}
                  onSuccess={privateAccessKey => {
                    setCreatedKey(privateAccessKey);
                    setCreateAccessTokenState(CreateAccessTokenState.closed);
                    refetchQuery();
                  }}
                />
              </>
            ) : (
              <Button disabled data-cy="organization-settings-access-tokens-create-new">
                Create new access token
              </Button>
            )}
            <DiscardAccessTokenDraft
              open={createAccessTokenState === CreateAccessTokenState.closing}
              onContinue={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
              onDiscard={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
            />
            <AccessTokenCreatedDialog
              open={createdKey !== null}
              privateAccessKey={shownKey ?? ''}
              onClose={() => setCreatedKey(null)}
            />
          </>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-access-tokens">
        {query.fetching && !query.data?.organization && (
          <div className="space-y-3">
            <div className="flex w-full items-center space-x-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/4" />
            </div>
            <div className="flex w-full items-center space-x-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/4" />
            </div>
            <div className="flex w-full items-center space-x-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/4" />
            </div>
          </div>
        )}
        {query.data?.organization && (
          <AccessTokensTable
            accessTokens={query.data.organization.allAccessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
          />
        )}
      </div>
    </SubPageLayout>
  );
}
