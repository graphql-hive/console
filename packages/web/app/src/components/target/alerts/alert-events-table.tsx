import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { type MetricAlertRuleState, type MetricAlertRuleType } from '@/gql/graphql';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertEventDetail,
  stateBadgeItem,
  type AlertEventDetailRule,
  type AlertEventRow,
} from './alert-event-detail';

export type { AlertEventRow };
export type AlertEventsTableRule = AlertEventDetailRule;

type AlertEventsTableProps = {
  stateLog: AlertEventRow[];
  rule: AlertEventsTableRule;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  /** Optional — only used by the activity page to type-narrow; unused on detail page */
  ruleType?: MetricAlertRuleType;
};

const columnHelper = createColumnHelper<AlertEventRow>();

const COLUMNS = [
  columnHelper.accessor('createdAt', {
    header: 'Timestamp',
    cell: info => <DataTableCell kind="time" date={info.getValue()} mode="absolute" mono />,
  }),
  columnHelper.display({
    id: 'age',
    header: 'Age',
    cell: ctx => <DataTableCell kind="time" date={ctx.row.original.createdAt} mono />,
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    meta: { width: 'fill' },
    cell: ctx => (
      <DataTableCell
        kind="status"
        from={stateBadgeItem(ctx.row.original.fromState as MetricAlertRuleState)}
        to={stateBadgeItem(ctx.row.original.toState as MetricAlertRuleState)}
      />
    ),
  }),
];

export function AlertEventsTable({
  stateLog,
  rule,
  organizationSlug,
  projectSlug,
  targetSlug,
}: AlertEventsTableProps) {
  return (
    <DataTable
      data={stateLog}
      columns={COLUMNS}
      getRowId={row => row.id}
      emptyMessage="No state transitions in the selected time range."
      renderSubComponent={row => (
        <AlertEventDetail
          rule={rule}
          event={row.original}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      )}
    />
  );
}
