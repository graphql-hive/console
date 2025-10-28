import { EllipsisIcon, LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as DropDownMenu from '@/components/ui/dropdown-menu';
import * as Table from '@/components/ui/table';
import { TimeAgo } from '@/components/v2';
import { graphql, useFragment, type FragmentType } from '@/gql';

const privateKeyFiller = new Array(20).fill('•').join('');

const AccessTokensTable_AccessTokenConnectionFragment = graphql(`
  fragment AccessTokensTable_AccessTokenConnectionFragment on AccessTokenConnection {
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

type AccessTokensTable = {
  organizationSlug: string;
  accessTokens: FragmentType<typeof AccessTokensTable_AccessTokenConnectionFragment>;
  refetch: () => void;
  fetchMore: () => void;
  isFetchingMore: boolean;
  onDeleteAccessToken: (accessTokenId: string) => void;
  onShowDetailView: (accessTokenId: string) => void;
};

export function AccessTokensTable(props: AccessTokensTable) {
  const accessTokens = useFragment(
    AccessTokensTable_AccessTokenConnectionFragment,
    props.accessTokens,
  );

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
          disabled={!accessTokens?.pageInfo?.hasNextPage || props.isFetchingMore}
          onClick={() => {
            props.fetchMore();
          }}
        >
          {props.isFetchingMore ? (
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
                  <DropDownMenu.DropdownMenuItem
                    onClick={() => props.onShowDetailView(edge.node.id)}
                  >
                    View Details
                  </DropDownMenu.DropdownMenuItem>
                  <DropDownMenu.DropdownMenuItem
                    onClick={() => props.onDeleteAccessToken(edge.node.id)}
                  >
                    Delete
                  </DropDownMenu.DropdownMenuItem>
                </DropDownMenu.DropdownMenuContent>
              </DropDownMenu.DropdownMenu>
            </Table.TableCell>
          </Table.TableRow>
        ))}
      </Table.TableBody>
    </Table.Table>
  );
}
