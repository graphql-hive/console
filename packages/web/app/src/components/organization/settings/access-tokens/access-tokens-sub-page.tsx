import { useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { useClient, useQuery } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DocsLink } from '@/components/ui/docs-note';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import * as Table from '@/components/ui/table';
import { TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { CreateAccessTokenSheetContent } from './create-access-token-sheet-content';

type AccessTokensSubPageProps = {
  organizationSlug: string;
};

const AccessTokensSubPage_OrganizationQuery = graphql(`
  query AccessTokensSubPage_OrganizationQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessTokens(first: 10) {
        ...AccessTokensTable_OrganizationAccessTokenConnectionFragment
      }
      ...CreateAccessTokenSheetContent_OrganizationFragment
      ...ResourceSelector_OrganizationFragment
    }
  }
`);

const enum CreateAccessTokenState {
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
                // TODO: update this link
                href="/todo"
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
          />
        )}
      </div>
    </SubPageLayout>
  );
}

const AccessTokensTable_OrganizationAccessTokenConnectionFragment = graphql(`
  fragment AccessTokensTable_OrganizationAccessTokenConnectionFragment on OrganizationAccessTokenConnection {
    edges {
      cursor
      node {
        id
        title
        firstCharacters
        createdAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
`);

const AccessTokensTable_MoreAccessTokensQuery = graphql(`
  query AccessTokensTable_MoreAccessTokensQuery($organizationSlug: String!, $after: String) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      accessTokens(first: 10, after: $after) {
        ...AccessTokensTable_OrganizationAccessTokenConnectionFragment
        pageInfo {
          endCursor
        }
      }
    }
  }
`);

function AccessTokensTable(props: {
  organizationSlug: string;
  accessTokens: FragmentType<typeof AccessTokensTable_OrganizationAccessTokenConnectionFragment>;
}) {
  const accessTokens = useFragment(
    AccessTokensTable_OrganizationAccessTokenConnectionFragment,
    props.accessTokens,
  );

  const client = useClient();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (accessTokens.edges.length === 0) {
    return null;
  }

  return (
    <Table.Table>
      <Table.TableCaption>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto mr-0 flex"
          disabled={!accessTokens?.pageInfo?.hasNextPage || isLoadingMore}
          onClick={() => {
            if (accessTokens?.pageInfo?.endCursor && accessTokens?.pageInfo?.hasNextPage) {
              setIsLoadingMore(true);
              void client
                .query(AccessTokensTable_MoreAccessTokensQuery, {
                  organizationSlug: props.organizationSlug,
                  after: accessTokens.pageInfo?.endCursor,
                })
                .toPromise()
                .finally(() => {
                  setIsLoadingMore(false);
                });
            }
          }}
        >
          {isLoadingMore ? (
            <>
              <LoaderCircleIcon className="mr-2 inline size-4 animate-spin" /> Loading
            </>
          ) : (
            'Load more'
          )}
        </Button>
      </Table.TableCaption>
      <Table.TableHeader>
        <Table.TableRow>
          <Table.TableHead>Title</Table.TableHead>
          <Table.TableHead className="w-[100px]">Private Key</Table.TableHead>
          <Table.TableHead className="text-right">Created At</Table.TableHead>
        </Table.TableRow>
      </Table.TableHeader>
      <Table.TableBody>
        {accessTokens.edges.map(edge => (
          <Table.TableRow>
            <Table.TableCell className="font-medium">{edge.node.title}</Table.TableCell>
            <Table.TableCell className="font-mono">
              {edge.node.firstCharacters + filler}
            </Table.TableCell>
            <Table.TableCell className="text-right">
              created <TimeAgo date={edge.node.createdAt} />
            </Table.TableCell>
          </Table.TableRow>
        ))}
      </Table.TableBody>
    </Table.Table>
  );
}

const filler = new Array(20).fill('•').join('');
