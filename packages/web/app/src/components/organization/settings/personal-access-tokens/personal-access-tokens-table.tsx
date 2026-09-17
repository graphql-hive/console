import { useState } from 'react';
import { useClient } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { graphql, useFragment, type DocumentType, type FragmentType } from '@/gql';
import { usePagedConnection } from '@/lib/hooks';
import type { ColumnDef } from '@tanstack/react-table';
import { DeleteAccessTokenConfirmationDialog } from '../access-tokens/delete-access-token-confirmation-dialog';
import { TokenExpiration } from '../access-tokens/token-expiration';
import { PersonalAccessTokenDetailViewSheet } from './personal-access-token-detail-view-sheet';

const privateKeyFiller = new Array(20).fill('•').join('');

const PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment = graphql(`
  fragment PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment on PersonalAccessTokenConnection {
    edges {
      cursor
      node {
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

const PersonalAccessTokensTable_MoreAccessTokensQuery = graphql(`
  query PersonalAccessTokensTable_MoreAccessTokensQuery(
    $organizationSlug: String!
    $after: String
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      me {
        id
        accessTokens(first: 10, after: $after) {
          ...PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment
          pageInfo {
            endCursor
          }
        }
      }
    }
  }
`);

type AccessTokenEdge = DocumentType<
  typeof PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment
>['edges'][number];

type AccessTokensTable = {
  organizationSlug: string;
  accessTokens: FragmentType<
    typeof PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment
  >;
  refetch: () => void;
};

export function PersonalAccessTokensTable(props: AccessTokensTable) {
  const accessTokens = useFragment(
    PersonalAccessTokensTable_PersonalAccessTokenConnectionFragment,
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
        .query(PersonalAccessTokensTable_MoreAccessTokensQuery, {
          organizationSlug: props.organizationSlug,
          after,
        })
        .toPromise(),
  });

  const columns: ColumnDef<AccessTokenEdge, unknown>[] = [
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
  ];

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={edge => edge.node.id}
        pagination={pagination}
        emptyMessage="No personal access tokens yet."
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
      <PersonalAccessTokenDetailViewSheet
        open={detailViewId !== null}
        organizationSlug={props.organizationSlug}
        accessTokenId={detailViewId}
        onClose={() => setDetailViewId(null)}
      />
    </>
  );
}
