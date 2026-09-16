import { ReactElement, useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useQuery } from 'urql';
import { Card } from '@/components/base/card/card';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { FragmentType, graphql, useFragment } from '@/gql';
import { DateRangeInput, OperationStatsFilterInput } from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks';
import type { ColumnDef } from '@tanstack/react-table';
import { OperationsFallback } from './fallback';

interface Operation {
  id: string;
  name: string;
  kind: string;
  p90: number;
  p95: number;
  p99: number;
  failureRate: number;
  requests: number;
  percentage: number;
  impact: number;
  hash: string;
}

function OperationsTable({
  operations,
  organizationSlug,
  projectSlug,
  targetSlug,
  selectedPeriod,
}: {
  operations: Operation[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  clients: readonly { name: string }[] | null;
  clientFilter: string | null;
  setClientFilter: (filter: string) => void;
  selectedPeriod: { from: string; to: string } | null;
}): ReactElement {
  const columns: ColumnDef<Operation, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Operations',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell
          kind="link"
          tone="accent"
          truncate
          label={row.original.name}
          link={{
            to: '/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash',
            params: {
              organizationSlug,
              projectSlug,
              targetSlug,
              operationName: row.original.name,
              operationHash: row.original.hash,
            },
            search: {
              from: selectedPeriod?.from ? encodeURIComponent(selectedPeriod.from) : undefined,
              to: selectedPeriod?.to ? encodeURIComponent(selectedPeriod.to) : undefined,
            },
          }}
          trailing={
            row.original.name === 'anonymous' ? (
              <Popover
                trigger={
                  <button type="button" aria-label="Anonymous operation" className="inline-flex">
                    <TriangleAlert className="text-warning size-3.5" />
                  </button>
                }
                openOnHover
                content={
                  <p className="text-neutral-11 text-sm">
                    Anonymous operation detected. Naming your operations is a recommended practice
                  </p>
                }
              />
            ) : undefined
          }
        />
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      meta: { align: 'center' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.kind} tone="muted" />,
    },
    {
      accessorKey: 'p90',
      header: 'p90',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={formatDuration(row.original.p90)} mono />
      ),
    },
    {
      accessorKey: 'p95',
      header: 'p95',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={formatDuration(row.original.p95)} mono />
      ),
    },
    {
      accessorKey: 'p99',
      header: 'p99',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => (
        <DataTableCell kind="text" value={formatDuration(row.original.p99)} mono />
      ),
    },
    {
      accessorKey: 'failureRate',
      header: 'Failure Rate',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => (
        <DataTableCell kind="number" value={row.original.failureRate} format="percent" />
      ),
    },
    {
      accessorKey: 'requests',
      header: 'Requests',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => <DataTableCell kind="number" value={row.original.requests} />,
    },
    {
      accessorKey: 'impact',
      header: 'Impact',
      meta: {
        align: 'right',
        sortable: true,
        tooltip:
          'Total time spent on this operation in the selected period, in seconds: requests times the average duration.',
      },
      cell: ({ row }) => (
        <DataTableCell
          kind="number"
          value={
            row.original.impact < 1000
              ? Math.round(row.original.impact * 100) / 100
              : Math.round(row.original.impact)
          }
        />
      ),
    },
    {
      accessorKey: 'percentage',
      header: 'Traffic',
      meta: { align: 'right', sortable: true },
      cell: ({ row }) => (
        <DataTableCell kind="number" value={row.original.percentage} format="percent" />
      ),
    },
    {
      id: 'bar',
      meta: { width: 'sm' },
      cell: ({ row }) => <DataTableCell kind="bar" value={row.original.percentage} max={100} />,
    },
  ];

  return (
    <div className="mt-12">
      <Card
        variants={{ onSurface: 'raised', titleSize: 'large' }}
        title="Operations"
        description="List of all operations with their statistics, filtered by selected clients."
      >
        <DataTable
          data={operations}
          columns={columns}
          getRowId={operation => operation.id}
          pagination={{ kind: 'client', pageSize: 20 }}
          emptyMessage="No operations in the selected period."
        />
      </Card>
    </div>
  );
}

const OperationsTableContainer_OperationsStatsFragment = graphql(`
  fragment OperationsTableContainer_OperationsStatsFragment on OperationsStats {
    clients {
      edges {
        node {
          name
        }
      }
    }
    operations {
      edges {
        node {
          id
          name
          operationHash
          kind
          duration {
            p90
            p95
            p99
            avg
          }
          countOk
          count
          percentage
        }
      }
    }
  }
`);

function OperationsTableContainer({
  organizationSlug,
  projectSlug,
  targetSlug,
  clientFilter,
  setClientFilter,
  selectedPeriod,
  ...props
}: {
  operationStats: FragmentType<typeof OperationsTableContainer_OperationsStatsFragment> | null;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  selectedPeriod: { from: string; to: string } | null;
  clientFilter: string | null;
  setClientFilter: (client: string) => void;
  className?: string;
}): ReactElement {
  const operationStats = useFragment(
    OperationsTableContainer_OperationsStatsFragment,
    props.operationStats,
  );
  const data = useMemo(() => {
    const records: Operation[] = [];
    if (operationStats) {
      for (const { node: op } of operationStats.operations.edges) {
        records.push({
          id: op.id,
          name: op.name,
          kind: op.kind,
          p90: op.duration.p90,
          p95: op.duration.p95,
          p99: op.duration.p99,
          failureRate: (1 - op.countOk / op.count) * 100,
          requests: op.count,
          percentage: op.percentage,
          impact: op.duration.avg > 0 ? op.count * (op.duration.avg / 1000) : 0,
          hash: op.operationHash!,
        });
      }
    }

    return records;
  }, [operationStats?.operations.edges]);

  return (
    <OperationsTable
      operations={data}
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      targetSlug={targetSlug}
      clients={operationStats?.clients.edges.map(edge => edge.node) ?? null}
      clientFilter={clientFilter}
      setClientFilter={setClientFilter}
      selectedPeriod={selectedPeriod}
    />
  );
}

const OperationsList_OperationsStatsQuery = graphql(`
  query OperationsList_OperationsStats(
    $targetSelector: TargetSelectorInput!
    $period: DateRangeInput!
    $filter: OperationStatsFilterInput!
  ) {
    target(reference: { bySelector: $targetSelector }) {
      id
      operationsStats(period: $period, filter: $filter) {
        clients {
          edges {
            __typename
          }
        }
        operations {
          edges {
            node {
              id
            }
            __typename
          }
        }
        ...OperationsTableContainer_OperationsStatsFragment
      }
    }
  }
`);

export function OperationsList({
  organizationSlug,
  projectSlug,
  targetSlug,
  period,
  filter,
  selectedPeriod,
}: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  period: DateRangeInput;
  filter: OperationStatsFilterInput;
  selectedPeriod: null | { to: string; from: string };
}): ReactElement {
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [query, refetchQuery] = useQuery({
    query: OperationsList_OperationsStatsQuery,
    variables: {
      targetSelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
      period,
      filter,
    },
  });

  const refetch = () => refetchQuery({ requestPolicy: 'cache-and-network' });

  useEffect(() => {
    if (!query.fetching) {
      refetch();
    }
  }, [period, filter]);

  return (
    <OperationsFallback
      state={query.fetching ? 'fetching' : query.error ? 'error' : 'success'}
      refetch={() => refetch()}
    >
      <OperationsTableContainer
        operationStats={query.data?.target?.operationsStats ?? null}
        setClientFilter={setClientFilter}
        clientFilter={clientFilter}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        selectedPeriod={selectedPeriod}
      />
    </OperationsFallback>
  );
}
