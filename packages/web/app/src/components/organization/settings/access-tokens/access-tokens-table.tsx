import { useMemo, useState } from 'react';
import { useClient } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { graphql, useFragment, type DocumentType, type FragmentType } from '@/gql';
import { usePagedConnection, useSlugs } from '@/lib/hooks';
import type { ColumnDef } from '@tanstack/react-table';
import { AccessTokenDetailViewSheet } from './access-token-detail-view-sheet';
import { DeleteAccessTokenConfirmationDialog } from './delete-access-token-confirmation-dialog';
import { TokenExpiration } from './token-expiration';

const privateKeyFiller = new Array(20).fill('•').join('');

const AccessTokensTable_AccessTokenConnectionFragment = graphql(`
  fragment AccessTokensTable_AccessTokenConnectionFragment on AccessTokenConnection {
    edges {
      cursor
      node {
        __typename
        id
        title
        firstCharacters
        createdAt
        expiresAt
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
      allAccessTokens(first: 10, after: $after) {
        ...AccessTokensTable_AccessTokenConnectionFragment
        pageInfo {
          endCursor
        }
      }
    }
  }
`);

type AccessTokenEdge = DocumentType<
  typeof AccessTokensTable_AccessTokenConnectionFragment
>['edges'][number];

type AccessTokensTable = {
  accessTokens: FragmentType<typeof AccessTokensTable_AccessTokenConnectionFragment>;
  refetch: () => void;
};

export function AccessTokensTable(props: AccessTokensTable) {
  const { organizationSlug } = useSlugs('organization');
  const accessTokens = useFragment(
    AccessTokensTable_AccessTokenConnectionFragment,
    props.accessTokens,
  );

  const client = useClient();
  const [deleteAccessTokenId, setDeleteAccessTokenId] = useState<string | null>(null);
  const [detailViewId, setDetailViewId] = useState<string | null>(null);
  const { rows, pagination } = usePagedConnection({
    edges: accessTokens.edges,
    pageInfo: accessTokens.pageInfo,
    pageSize: 10,
    loadMore: after =>
      client
        .query(AccessTokensTable_MoreAccessTokensQuery, {
          organizationSlug,
          after,
        })
        .toPromise(),
  });

  const columns = useMemo<ColumnDef<AccessTokenEdge, unknown>[]>(
    () => [
      {
        id: 'title',
        header: 'Title',
        meta: { width: 'fill' },
        cell: ({ row }) => (
          <DataTableCell kind="text" value={row.original.node.title} weight="medium" />
        ),
      },
      {
        id: 'key',
        header: 'Private Key',
        cell: ({ row }) => (
          <DataTableCell
            kind="text"
            value={row.original.node.firstCharacters + privateKeyFiller}
            mono
          />
        ),
      },
      {
        id: 'scope',
        header: 'Scope',
        cell: ({ row }) => (
          <DataTableCell
            kind="badge"
            items={{ content: typenameToScope(row.original.node.__typename), variant: 'success' }}
          />
        ),
      },
      {
        id: 'createdAt',
        header: 'Created At',
        meta: { align: 'center' },
        cell: ({ row }) => <DataTableCell kind="time" date={row.original.node.createdAt} />,
      },
      {
        id: 'expiresAt',
        header: 'Expiration',
        meta: { align: 'center' },
        cell: ({ row }) => (
          <DataTableCell
            kind="text"
            value={<TokenExpiration expiresAt={row.original.node.expiresAt ?? null} />}
          />
        ),
      },
      {
        id: 'actions',
        meta: { width: 'xs' },
        cell: ({ row }) => (
          <DataTableCell
            kind="actions"
            label={`Actions for ${row.original.node.title}`}
            sections={[
              [
                { label: 'View Details', onClick: () => setDetailViewId(row.original.node.id) },
                {
                  label: 'Delete',
                  variant: 'destructiveAction',
                  onClick: () => setDeleteAccessTokenId(row.original.node.id),
                },
              ],
            ]}
          />
        ),
      },
    ],
    [setDetailViewId, setDeleteAccessTokenId],
  );

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={edge => edge.node.id}
        pagination={pagination}
        emptyMessage="No access tokens yet."
      />
      <DeleteAccessTokenConfirmationDialog
        open={deleteAccessTokenId !== null}
        accessTokenId={deleteAccessTokenId}
        onCancel={() => setDeleteAccessTokenId(null)}
        onConfirm={() => {
          setDeleteAccessTokenId(null);
          props.refetch();
        }}
      />
      <AccessTokenDetailViewSheet
        open={detailViewId !== null}
        accessTokenId={detailViewId}
        onClose={() => setDetailViewId(null)}
      />
    </>
  );
}

function typenameToScope(typename: AccessTokenEdge['node']['__typename']): string {
  switch (typename) {
    case 'OrganizationAccessToken':
      return 'organization';
    case 'ProjectAccessToken':
      return 'project';
    case 'PersonalAccessToken':
      return 'personal';
    default:
      casesExceeded(typename);
  }
}

function casesExceeded(data: never): never {
  throw new Error(`Unhandled case: ${data}`);
}
