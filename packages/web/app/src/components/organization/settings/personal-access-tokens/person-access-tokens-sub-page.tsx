import { useCallback, useState } from 'react';
import { useClient, useQuery } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { graphql } from '@/gql';
import { CreateAccessTokenState } from '../access-tokens/access-tokens-sub-page';
import { AccessTokensTable } from '../access-tokens/access-tokens-table';
import { CreatePersonalAccessTokenSheetContent } from './create-personal-access-token-sheet-content';
import { PersonalAccessTokenDetailViewSheet } from './personal-access-token-detail-view-sheet';

const PersonalAccessTokensSubPage_OrganizationQuery = graphql(`
  query PersonalAccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        personalAccessTokens(first: 20) {
          ...AccessTokensTable_AccessTokenConnectionFragment
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      ...CreatePersonalAccessTokenSheetContent_OrganizationFragment
    }
  }
`);

const PersonalAccessTokensSubPage_FetchMorePersonalAccessTokensQuery = graphql(`
  query PersonalAccessTokensSubPage_FetchMorePersonalAccessTokensQuery(
    $organizationSlug: String!
    $after: String
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        personalAccessTokens(first: 20, after: $after) {
          ...AccessTokensTable_AccessTokenConnectionFragment
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`);

type PersonalAccessTokensSubPageProps = {
  organizationSlug: string;
};

export function PersonalAccessTokensSubPage(
  props: PersonalAccessTokensSubPageProps,
): React.ReactNode {
  const [query, refetchQuery] = useQuery({
    query: PersonalAccessTokensSubPage_OrganizationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
    requestPolicy: 'network-only',
  });
  const client = useClient();
  const [createAccessTokenState, setCreateAccessTokenState] = useState<CreateAccessTokenState>(
    CreateAccessTokenState.closed,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [deleteAccessTokenId, setDeleteAccessTokenId] = useState<string | null>(null);
  const [detailViewId, setDetailViewId] = useState<string | null>(null);

  const fetchMore = useCallback(() => {
    const pageInfo = query.data?.organization?.me.personalAccessTokens?.pageInfo;
    if (!pageInfo?.endCursor || !pageInfo?.hasNextPage) {
      return;
    }

    setIsFetchingMore(true);
    void client
      .query(PersonalAccessTokensSubPage_FetchMorePersonalAccessTokensQuery, {
        organizationSlug: props.organizationSlug,
        after: pageInfo.endCursor,
      })
      .toPromise()
      .finally(() => {
        setIsFetchingMore(false);
      });
  }, [query.data?.organization?.me.personalAccessTokens?.pageInfo]);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Personal Access Tokens"
        description={
          <>
            <CardDescription>TBD</CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Access Tokens
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <div className="my-3.5 space-y-4" data-cy="organization-settings-personal-access-tokens">
        <Sheet.Sheet
          open={createAccessTokenState !== CreateAccessTokenState.closed}
          onOpenChange={isOpen => {
            if (isOpen === false) {
              setCreateAccessTokenState(CreateAccessTokenState.closing);
              return;
            }
            setCreateAccessTokenState(CreateAccessTokenState.open);
          }}
        >
          <Sheet.SheetTrigger asChild>
            <Button data-cy="organization-settings-access-tokens-create-new">
              Create new access token
            </Button>
          </Sheet.SheetTrigger>
          {createAccessTokenState !== CreateAccessTokenState.closed && query.data?.organization && (
            <CreatePersonalAccessTokenSheetContent
              organization={query.data.organization}
              onSuccess={() => {
                setCreateAccessTokenState(CreateAccessTokenState.closed);
                refetchQuery();
              }}
            />
          )}
        </Sheet.Sheet>
        {createAccessTokenState === CreateAccessTokenState.closing && (
          <AlertDialog.AlertDialog open>
            <AlertDialog.AlertDialogContent>
              <AlertDialog.AlertDialogHeader>
                <AlertDialog.AlertDialogTitle>
                  Do you want to discard the access token?
                </AlertDialog.AlertDialogTitle>
                <AlertDialog.AlertDialogDescription>
                  If you cancel now, any draft information will be lost.
                </AlertDialog.AlertDialogDescription>
              </AlertDialog.AlertDialogHeader>
              <AlertDialog.AlertDialogFooter>
                <AlertDialog.AlertDialogCancel
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.open)}
                >
                  Cancel
                </AlertDialog.AlertDialogCancel>
                <AlertDialog.AlertDialogAction
                  onClick={() => setCreateAccessTokenState(CreateAccessTokenState.closed)}
                >
                  Close
                </AlertDialog.AlertDialogAction>
              </AlertDialog.AlertDialogFooter>
            </AlertDialog.AlertDialogContent>
          </AlertDialog.AlertDialog>
        )}
        {query.data?.organization?.me.personalAccessTokens && (
          <AccessTokensTable
            accessTokens={query.data.organization.me.personalAccessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
            isFetchingMore={isFetchingMore}
            fetchMore={fetchMore}
            onDeleteAccessToken={setDeleteAccessTokenId}
            onShowDetailView={setDetailViewId}
          />
        )}
        {detailViewId && (
          <PersonalAccessTokenDetailViewSheet
            organizationSlug={props.organizationSlug}
            personalAccessTokenId={detailViewId}
            onClose={() => setDetailViewId(null)}
          />
        )}
      </div>
    </SubPageLayout>
  );
}
