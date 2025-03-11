import { useState } from 'react';
import { EllipsisIcon, LoaderCircleIcon } from 'lucide-react';
import { useClient, useMutation } from 'urql';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import * as DropDownMenu from '@/components/ui/dropdown-menu';
import * as Table from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { TimeAgo } from '@/components/v2';
import { graphql, useFragment, type FragmentType } from '@/gql';
import { AccessTokenDetailViewSheet } from './access-token-detail-view-sheet';

const privateKeyFiller = new Array(20).fill('•').join('');

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

type AccessTokensTable = {
  organizationSlug: string;
  accessTokens: FragmentType<typeof AccessTokensTable_OrganizationAccessTokenConnectionFragment>;
  refetch: () => void;
};

export function AccessTokensTable(props: AccessTokensTable) {
  const accessTokens = useFragment(
    AccessTokensTable_OrganizationAccessTokenConnectionFragment,
    props.accessTokens,
  );

  const client = useClient();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deleteAccessTokenId, setDeleteAccessTokenId] = useState<string | null>(null);
  const [detailViewId, setDetailViewId] = useState<string | null>(null);

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
          <Table.TableHead className="text-right" />
        </Table.TableRow>
      </Table.TableHeader>
      <Table.TableBody>
        {accessTokens.edges.map(edge => (
          <Table.TableRow key={edge.cursor}>
            <Table.TableCell className="font-medium">{edge.node.title}</Table.TableCell>
            <Table.TableCell className="font-mono">
              {edge.node.firstCharacters + privateKeyFiller}
            </Table.TableCell>
            <Table.TableCell className="text-right">
              created <TimeAgo date={edge.node.createdAt} />
            </Table.TableCell>
            <Table.TableCell className="text-right align-middle">
              <DropDownMenu.DropdownMenu>
                <DropDownMenu.DropdownMenuTrigger className="ml-auto block">
                  <EllipsisIcon className="size-4" />
                </DropDownMenu.DropdownMenuTrigger>
                <DropDownMenu.DropdownMenuContent>
                  <DropDownMenu.DropdownMenuLabel>Options</DropDownMenu.DropdownMenuLabel>
                  <DropDownMenu.DropdownMenuItem onClick={() => setDetailViewId(edge.node.id)}>
                    View Details
                  </DropDownMenu.DropdownMenuItem>
                  <DropDownMenu.DropdownMenuItem
                    onClick={() => setDeleteAccessTokenId(edge.node.id)}
                  >
                    Delete
                  </DropDownMenu.DropdownMenuItem>
                </DropDownMenu.DropdownMenuContent>
              </DropDownMenu.DropdownMenu>
            </Table.TableCell>
          </Table.TableRow>
        ))}
      </Table.TableBody>
      {deleteAccessTokenId && (
        <DeleteAccessTokenConfirmationDialogue
          accessTokenId={deleteAccessTokenId}
          onCancel={() => setDeleteAccessTokenId(null)}
          onConfirm={() => {
            setDeleteAccessTokenId(null);
            props.refetch();
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
    </Table.Table>
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
                  organizationAccessTokenId: props.accessTokenId,
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
