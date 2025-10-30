import { useCallback, useState } from 'react';
import { useClient, useMutation, useQuery } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import { AccessTokenDetailViewSheet } from './access-token-detail-view-sheet';
import { AccessTokensTable } from './access-tokens-table';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessTokens(first: 10) {
        ...AccessTokensTable_AccessTokenConnectionFragment
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

const AccessTokensSubPage_FetchMoreAccessTokensQuery = graphql(`
  query AccessTokensTable_MoreAccessTokensQuery($organizationSlug: String!, $after: String) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessTokens(first: 10, after: $after) {
        ...AccessTokensTable_AccessTokenConnectionFragment
        pageInfo {
          hasNextPage
          endCursor
        }
      }
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
  const client = useClient();
  const [createAccessTokenState, setCreateAccessTokenState] = useState<CreateAccessTokenState>(
    CreateAccessTokenState.closed,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [deleteAccessTokenId, setDeleteAccessTokenId] = useState<string | null>(null);
  const [detailViewId, setDetailViewId] = useState<string | null>(null);

  const fetchMore = useCallback(() => {
    const pageInfo = query.data?.organization?.accessTokens?.pageInfo;
    if (!pageInfo?.endCursor || !pageInfo?.hasNextPage) {
      return;
    }

    setIsFetchingMore(true);
    void client
      .query(AccessTokensSubPage_FetchMoreAccessTokensQuery, {
        organizationSlug: props.organizationSlug,
        after: pageInfo.endCursor,
      })
      .toPromise()
      .finally(() => {
        setIsFetchingMore(false);
      });
  }, [query.data?.organization?.accessTokens?.pageInfo]);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Access Tokens"
        description={
          <>
            <CardDescription>
              Access Tokens are used for the Hive CLI, Hive Public GraphQL API and Hive Usage
              Reporting. Granular resource based access can be granted based on permissions.
            </CardDescription>
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
      <div className="my-3.5 space-y-4" data-cy="organization-settings-access-tokens">
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
            <>
              <CreateAccessTokenSheetContent
                organization={query.data.organization}
                onSuccess={() => {
                  setCreateAccessTokenState(CreateAccessTokenState.closed);
                  refetchQuery();
                }}
              />
            </>
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
        {query.data?.organization && (
          <AccessTokensTable
            accessTokens={query.data.organization.accessTokens}
            organizationSlug={props.organizationSlug}
            refetch={refetchQuery}
            isFetchingMore={isFetchingMore}
            fetchMore={fetchMore}
            onDeleteAccessToken={setDeleteAccessTokenId}
            onShowDetailView={setDetailViewId}
          />
        )}
        {deleteAccessTokenId && (
          <DeleteAccessTokenConfirmationDialogue
            accessTokenId={deleteAccessTokenId}
            onCancel={() => setDeleteAccessTokenId(null)}
            onConfirm={() => {
              setDeleteAccessTokenId(null);
              refetchQuery();
            }}
          />
        )}
        {detailViewId && (
          <AccessTokenDetailViewSheet
            organizationSlug={props.organizationSlug}
            accessTokenId={detailViewId}
            onClose={() => setDetailViewId(null)}
          />
        )}
      </div>
    </SubPageLayout>
  );
}

const DeleteAccessTokenConfirmationDialogue_DeleteOrganizationAccessToken = graphql(`
  mutation DeleteAccessTokenConfirmationDialogue_DeleteOrganizationAccessToken(
    $input: DeleteOrganizationAccessTokenInput!
  ) {
    deleteOrganizationAccessToken(input: $input) {
      error {
        message
      }
      ok {
        deletedOrganizationAccessTokenId
      }
    }
  }
`);

type DeleteAccessTokenConfirmationDialogueProps = {
  accessTokenId: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function DeleteAccessTokenConfirmationDialogue(props: DeleteAccessTokenConfirmationDialogueProps) {
  const [mutationState, mutate] = useMutation(
    DeleteAccessTokenConfirmationDialogue_DeleteOrganizationAccessToken,
  );
  const { toast } = useToast();

  return (
    <AlertDialog.AlertDialog open>
      <AlertDialog.AlertDialogContent>
        <AlertDialog.AlertDialogHeader>
          <AlertDialog.AlertDialogTitle>
            Do you want to delete this access token?
          </AlertDialog.AlertDialogTitle>
          <AlertDialog.AlertDialogDescription>
            If you cancel now, any draft information will be lost.
          </AlertDialog.AlertDialogDescription>
        </AlertDialog.AlertDialogHeader>
        <AlertDialog.AlertDialogFooter>
          <AlertDialog.AlertDialogCancel
            onClick={mutationState.fetching ? undefined : props.onCancel}
            disabled={mutationState.fetching}
          >
            Cancel
          </AlertDialog.AlertDialogCancel>
          <AlertDialog.AlertDialogAction
            onClick={() =>
              mutate({
                input: {
                  organizationAccessToken: {
                    byId: props.accessTokenId,
                  },
                },
              }).then(result => {
                if (result.error) {
                  toast({
                    variant: 'destructive',
                    title: 'Delete Access Token failed.',
                    description: result.error.message,
                  });
                }
                if (result.data?.deleteOrganizationAccessToken.error) {
                  toast({
                    variant: 'destructive',
                    title: 'Delete Access Token failed.',
                    description: result.data.deleteOrganizationAccessToken.error.message,
                  });
                }
                if (result.data?.deleteOrganizationAccessToken.ok) {
                  toast({
                    variant: 'default',
                    title: 'Access Token deleted.',
                    description: 'It can take up to 5 minutes for changes to propagate.',
                  });
                  props.onConfirm();
                }
              })
            }
          >
            Delete Access Token
          </AlertDialog.AlertDialogAction>
        </AlertDialog.AlertDialogFooter>
      </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
  );
}
