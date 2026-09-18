import { ReactElement, ReactNode } from 'react';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Stat } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { BillingPlanType } from '@/gql/graphql';
import type { ColumnDef } from '@tanstack/react-table';
import { CurrencyFormatter, formatMillionOrBillion } from './helpers';

const PriceEstimationTable_PlanFragment = graphql(`
  fragment PriceEstimationTable_PlanFragment on BillingPlan {
    id
    includedOperationsLimit
    pricePerOperationsUnit
    basePrice
    planType
  }
`);

type PriceRow = {
  id: string;
  feature: string;
  aside?: string;
  units: string | null;
  unitPrice: number;
  total: number;
};

const PRICE_COLUMNS: ColumnDef<PriceRow, unknown>[] = [
  {
    id: 'feature',
    header: 'Feature',
    meta: { width: 'fill' },
    cell: ({ row }) => (
      <DataTableCell kind="text" value={row.original.feature} secondary={row.original.aside} />
    ),
  },
  {
    id: 'units',
    header: 'Units',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) =>
      row.original.units ? (
        <DataTableCell kind="number" value={row.original.units} />
      ) : (
        <DataTableCell kind="placeholder" />
      ),
  },
  {
    id: 'unitPrice',
    header: 'Unit Price',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.unitPrice} format="currency" />
    ),
  },
  {
    id: 'total',
    header: 'Total',
    meta: { align: 'right', width: 'sm' },
    cell: ({ row }) => <DataTableCell kind="number" value={row.original.total} format="currency" />,
  },
];

function PriceEstimationTable(props: {
  plan: FragmentType<typeof PriceEstimationTable_PlanFragment>;
  operationsRateLimit: number;
}): ReactElement {
  const plan = useFragment(PriceEstimationTable_PlanFragment, props.plan);
  const includedOperationsInMillions = (plan.includedOperationsLimit ?? 0) / 1_000_000;
  const additionalOperations = Math.max(
    0,
    props.operationsRateLimit - includedOperationsInMillions,
  );
  const operationsTotal = (plan.pricePerOperationsUnit ?? 0) * additionalOperations;
  const total = (plan.basePrice ?? 0) + operationsTotal;

  const rows: PriceRow[] = [
    {
      id: 'base',
      feature: 'Base price',
      aside: '(unlimited seats)',
      units: null,
      unitPrice: plan.basePrice ?? 0,
      total: plan.basePrice ?? 0,
    },
  ];
  if (includedOperationsInMillions > 0) {
    rows.push({
      id: 'included',
      feature: 'Included Operations',
      aside: '(free)',
      units: formatMillionOrBillion(includedOperationsInMillions),
      unitPrice: 0,
      total: 0,
    });
  }
  if (plan.planType === BillingPlanType.Pro) {
    rows.push({
      id: 'operations',
      feature: 'Operations',
      units: formatMillionOrBillion(additionalOperations),
      unitPrice: plan.pricePerOperationsUnit ?? 0,
      total: operationsTotal,
    });
  }

  return (
    <DataTable
      data={rows}
      columns={PRICE_COLUMNS}
      getRowId={row => row.id}
      pagination={{ kind: 'none' }}
      footer={{
        label: 'Total monthly (after trial ends)',
        value: total === 0 ? 'FREE' : CurrencyFormatter.format(total),
      }}
    />
  );
}

const PlanSummary_PlanFragment = graphql(`
  fragment PlanSummary_PlanFragment on BillingPlan {
    planType
    retentionInDays
    ...PriceEstimationTable_PlanFragment
  }
`);

export function PlanSummary({
  operationsRateLimit,
  children,
  ...props
}: {
  plan: FragmentType<typeof PlanSummary_PlanFragment>;
  operationsRateLimit: number;
  children: ReactNode;
}): ReactElement {
  const plan = useFragment(PlanSummary_PlanFragment, props.plan);
  if (plan.planType === BillingPlanType.Enterprise) {
    return (
      <Stat>
        <Stat.Label>Plan Type</Stat.Label>
        <Stat.Number>{plan.planType}</Stat.Number>
        <Stat.HelpText>
          Enterprise plan is for organizations that needs to ship and ingest large amount of data,
          and needs ongoing support around GraphQL APIs.
        </Stat.HelpText>
      </Stat>
    );
  }

  return (
    <>
      <div className="flex gap-32">
        <Stat className="mb-8">
          <Stat.Label>Plan</Stat.Label>
          <Stat.HelpText>type</Stat.HelpText>
          <Stat.Number>{plan.planType}</Stat.Number>
        </Stat>

        {children}

        <Stat>
          <Stat.Label>Operations Limit</Stat.Label>
          <Stat.HelpText>up to / per month</Stat.HelpText>
          <Stat.Number>{formatMillionOrBillion(operationsRateLimit)}</Stat.Number>
        </Stat>
        <Stat className="mb-8">
          <Stat.Label>Retention</Stat.Label>
          <Stat.HelpText>usage reports</Stat.HelpText>
          <Stat.Number>{plan.retentionInDays} days</Stat.Number>
        </Stat>
      </div>
      <PriceEstimationTable plan={plan} operationsRateLimit={operationsRateLimit} />
    </>
  );
}
