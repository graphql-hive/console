import { ReactElement } from 'react';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { BillingInvoiceStatus } from '@/gql/graphql';
import type { ColumnDef } from '@tanstack/react-table';

const OrganizationInvoicesList_OrganizationFragment = graphql(`
  fragment OrganizationInvoicesList_OrganizationFragment on Organization {
    id
    slug
    billingConfiguration {
      hasPaymentIssues
      invoices {
        id
        date
        amount
        periodStart
        periodEnd
        pdfLink
        status
      }
    }
  }
`);

type Invoice = NonNullable<
  NonNullable<
    DocumentType<typeof OrganizationInvoicesList_OrganizationFragment>['billingConfiguration']
  >['invoices']
>[number];

const STATUS_BADGE: Record<BillingInvoiceStatus, 'success' | 'info' | 'warning' | 'critical'> = {
  [BillingInvoiceStatus.Paid]: 'success',
  [BillingInvoiceStatus.Open]: 'info',
  [BillingInvoiceStatus.Draft]: 'info',
  [BillingInvoiceStatus.Uncollectible]: 'critical',
  [BillingInvoiceStatus.Void]: 'warning',
};

const INVOICE_COLUMNS: ColumnDef<Invoice, unknown>[] = [
  {
    id: 'date',
    header: 'Invoice Date',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.date} mode="date" />,
  },
  {
    id: 'amount',
    header: 'Amount',
    meta: { align: 'right' },
    cell: ({ row }) => (
      <DataTableCell kind="number" value={row.original.amount} format="currency" />
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <DataTableCell
        kind="badge"
        items={{
          content: row.original.status.charAt(0) + row.original.status.slice(1).toLowerCase(),
          variant: STATUS_BADGE[row.original.status],
        }}
      />
    ),
  },
  {
    id: 'periodStart',
    header: 'Period Start',
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.periodStart} mode="date" />,
  },
  {
    id: 'periodEnd',
    header: 'Period End',
    meta: { width: 'fill' },
    cell: ({ row }) => <DataTableCell kind="time" date={row.original.periodEnd} mode="date" />,
  },
  {
    id: 'pdf',
    header: 'PDF',
    cell: ({ row }) =>
      row.original.pdfLink ? (
        <DataTableCell
          kind="link"
          label="Download"
          href={row.original.pdfLink}
          external
          tone="accent"
        />
      ) : (
        <DataTableCell kind="placeholder" />
      ),
  },
];

export function InvoicesList(props: {
  organization: FragmentType<typeof OrganizationInvoicesList_OrganizationFragment>;
}): ReactElement | null {
  const organization = useFragment(
    OrganizationInvoicesList_OrganizationFragment,
    props.organization,
  );
  if (!organization.billingConfiguration?.invoices?.length) {
    return null;
  }

  return (
    <DataTable
      data={[...organization.billingConfiguration.invoices]}
      columns={INVOICE_COLUMNS}
      getRowId={invoice => invoice.id}
      pagination={{ kind: 'none' }}
    />
  );
}
