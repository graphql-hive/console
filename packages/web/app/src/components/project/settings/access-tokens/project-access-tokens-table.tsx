import { useMemo, useState } from 'react';
import { useClient } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { DeleteAccessTokenConfirmationDialog } from '@/components/organization/settings/access-tokens/delete-access-token-confirmation-dialog';
import { TokenExpiration } from '@/components/organization/settings/access-tokens/token-expiration';
import { graphql, useFragment, type DocumentType, type FragmentType } from '@/gql';
import { usePagedConnection } from '@/lib/hooks';
import type { ColumnDef } from '@tanstack/react-table';
import { ProjectAccessTokenDetailViewSheet } from './project-access-token-detail-view-sheet';

const privateKeyFiller = new Array(20).fill('•').join('');

const ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment = graphql(`
  fragment ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment on ProjectAccessTokenConnection {
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

const ProjectAccessTokensTable_MoreAccessTokensQuery = graphql(`
  query ProjectAccessTokensTable_MoreAccessTokensQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $after: String
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        accessTokens(first: 10, after: $after) {
          ...ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment
          pageInfo {
            endCursor
          }
        }
      }
    }
  }
`);

type AccessTokenEdge = DocumentType<
  typeof ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment
>['edges'][number];

type ProjectAccessTokensTable = {
  organizationSlug: string;
  projectSlug: string;
  accessTokens: FragmentType<typeof ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment>;
  refetch: () => void;
};

export function ProjectAccessTokensTable(props: ProjectAccessTokensTable) {
  const accessTokens = useFragment(
    ProjectAccessTokensTable_ProjectAccessTokenConnectionFragment,
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
        .query(ProjectAccessTokensTable_MoreAccessTokensQuery, {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
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
      <ProjectAccessTokenDetailViewSheet
        open={detailViewId !== null}
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        accessTokenId={detailViewId}
        onClose={() => setDetailViewId(null)}
      />
    </>
  );
}
