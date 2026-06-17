import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { DataTable } from '@/components/base/data-table/data-table';
import { BadgeRounded } from '@/components/ui/badge';
import { Avatar } from '@/components/v2/avatar';
import {
  MetricAlertRuleType,
  type MetricAlertRuleSeverity,
  type MetricAlertRuleState,
} from '@/gql/graphql';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertEventDetail,
  StateBadge,
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

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZoneName: 'short',
});

function formatTimestamp(iso: string): string {
  return TIMESTAMP_FORMAT.format(new Date(iso)).toUpperCase();
}

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
    cell: info => (
      <span className="text-neutral-12 font-mono text-[11px] tracking-wide">
        {formatTimestamp(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'age',
    header: 'Age',
    cell: ctx => (
      <span className="text-neutral-12 inline-flex items-center gap-1 font-mono text-[11px]">
        {formatDistanceToNow(new Date(ctx.row.original.createdAt), { addSuffix: true })}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: ctx => (
      <div className="text-neutral-11 inline-flex items-center gap-2">
        <StateBadge state={ctx.row.original.fromState as MetricAlertRuleState} />
        <ArrowRight className="text-neutral-8 size-3.5" />
        <StateBadge state={ctx.row.original.toState as MetricAlertRuleState} />
      </div>
    ),
  }),
  columnHelper.display({
    id: 'name',
    header: 'Alert name',
    cell: ctx => <span className="text-neutral-12 font-medium">{ctx.row.original.rule.name}</span>,
  }),
  columnHelper.display({
    id: 'type',
    header: 'Type',
    cell: ctx => <span className="text-neutral-11">{TYPE_LABEL[ctx.row.original.rule.type]}</span>,
  }),
  columnHelper.display({
    id: 'severity',
    header: 'Severity',
    cell: ctx => {
      const sev = String(ctx.row.original.rule.severity);
      return (
        <span className="text-neutral-12 inline-flex items-center gap-1.5">
          <BadgeRounded color={SEVERITY_DOT_COLOR[sev] ?? 'info'} className="size-2" />
          {SEVERITY_LABEL[sev] ?? sev}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'createdBy',
    header: 'Created by',
    cell: ctx => {
      const u = ctx.row.original.rule.createdBy;
      if (!u) return <span className="text-neutral-10">—</span>;
      return (
        <span className="text-neutral-12 inline-flex items-center gap-2">
          <Avatar size="xs" shape="circle" alt={u.displayName} />
          {u.displayName}
        </span>
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
