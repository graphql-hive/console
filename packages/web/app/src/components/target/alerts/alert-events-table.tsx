import { ArrowRight } from 'lucide-react';
import { DataTable } from '@/components/base/data-table/data-table';
import { type MetricAlertRuleState, type MetricAlertRuleType } from '@/gql/graphql';
import { createColumnHelper } from '@tanstack/react-table';
import {
  AlertEventDetail,
  StateBadge,
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

const columnHelper = createColumnHelper<AlertEventRow>();

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
    id: 'events',
    header: 'Events',
    cell: () => <span className="text-neutral-11">1</span>,
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
