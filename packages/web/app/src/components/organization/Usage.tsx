import { ReactElement } from 'react';
import { useQuery } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { DataWrapper } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import type { ColumnDef } from '@tanstack/react-table';

const OrganizationUsageEstimationView_OrganizationFragment = graphql(`
  fragment OrganizationUsageEstimationView_OrganizationFragment on Organization {
    id
    slug
    monthlyOperationsLimit
  }
`);

const Usage_UsageEstimationQuery = graphql(`
  query Usage_UsageEstimationQuery($orgId: ID!, $input: OrganizationUsageEstimationInput!) {
    organization(reference: { byId: $orgId }) {
      id
      usageEstimation(input: $input) {
        operations
      }
    }
  }
`);

type UsageRow = { id: string; feature: string; used: number | null; limit: number };

const USAGE_COLUMNS: ColumnDef<UsageRow, unknown>[] = [
  {
    id: 'feature',
    header: 'Feature',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="text" value={row.original.feature} />,
  },
  {
    id: 'used',
    header: 'Used',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) =>
      row.original.used === null ? (
        <DataTableCell kind="placeholder" />
      ) : (
        <DataTableCell kind="number" value={row.original.used} />
      ),
  },
  {
    id: 'limit',
    header: 'Limit',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.limit} />,
  },
  {
    id: 'bar',
    meta: { width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell kind="bar" value={row.original.used ?? 0} max={row.original.limit} />
    ),
  },
];

export function OrganizationUsageEstimationView(props: {
  organization: FragmentType<typeof OrganizationUsageEstimationView_OrganizationFragment>;
}): ReactElement {
  const organization = useFragment(
    OrganizationUsageEstimationView_OrganizationFragment,
    props.organization,
  );

  const [query] = useQuery({
    query: Usage_UsageEstimationQuery,
    variables: {
      orgId: organization.id,
      input: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
    },
  });

  return (
    <div className="right-4 top-7">
      <DataWrapper query={query} organizationSlug={organization.slug}>
        {result => (
          <DataTable
            data={[
              {
                id: 'operations',
                feature: 'Operations',
                used: result.data.organization?.usageEstimation?.operations ?? null,
                limit: organization.monthlyOperationsLimit,
              },
            ]}
            columns={USAGE_COLUMNS}
            getRowId={row => row.id}
            pagination={{ kind: 'none' }}
          />
        )}
      </DataWrapper>
    </div>
  );
}
