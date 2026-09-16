import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import {
  MetricAlertRuleType,
  type MetricAlertRuleSeverity,
  type MetricAlertRuleState,
} from '@/gql/graphql';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertEventDetail,
  stateBadgeItem,
  type AlertEventDetailRule,
  type AlertEventRow,
} from './alert-event-detail';

export type ActivityEventRow = AlertEventRow & {
  rule: AlertEventDetailRule & {
    id: string;
    severity: MetricAlertRuleSeverity;
    createdBy?: { id: string; displayName: string } | null;
  };
};

const TYPE_LABEL: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'Reliability',
  [MetricAlertRuleType.Latency]: 'Latency',
  [MetricAlertRuleType.Traffic]: 'Traffic',
};

const SEVERITY_DOT_COLOR: Record<string, 'critical' | 'warning' | 'info'> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  INFO: 'Info',
};

const columnHelper = createColumnHelper<ActivityEventRow>();

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
    cell: ctx => (
      <DataTableCell
        kind="status"
        from={stateBadgeItem(ctx.row.original.fromState as MetricAlertRuleState)}
        to={stateBadgeItem(ctx.row.original.toState as MetricAlertRuleState)}
      />
    ),
  }),
  columnHelper.display({
    id: 'name',
    header: 'Alert name',
    meta: { width: 'fill' },
    cell: ctx => <DataTableCell kind="text" value={ctx.row.original.rule.name} weight="medium" />,
  }),
  columnHelper.display({
    id: 'type',
    header: 'Type',
    cell: ctx => (
      <DataTableCell kind="text" value={TYPE_LABEL[ctx.row.original.rule.type]} tone="muted" />
    ),
  }),
  columnHelper.display({
    id: 'severity',
    header: 'Severity',
    cell: ctx => {
      const sev = String(ctx.row.original.rule.severity);
      return (
        <DataTableCell
          kind="status"
          label={SEVERITY_LABEL[sev] ?? sev}
          dot={SEVERITY_DOT_COLOR[sev] ?? 'info'}
        />
      );
    },
  }),
  columnHelper.display({
    id: 'createdBy',
    header: 'Created by',
    cell: ctx => {
      const u = ctx.row.original.rule.createdBy;
      return u ? (
        <DataTableCell kind="avatar" name={u.displayName} />
      ) : (
        <DataTableCell kind="placeholder" />
      );
    },
  }),
];

export function AlertActivityTable({
  events,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  events: ActivityEventRow[];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <DataTable
      data={events}
      columns={COLUMNS}
      getRowId={row => row.id}
      emptyMessage="No alert activity in the selected time range."
      renderSubComponent={row => (
        <AlertEventDetail
          rule={row.original.rule}
          event={row.original}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          showRuleDetailLink
          ruleId={row.original.rule.id}
        />
      )}
    />
  );
}
