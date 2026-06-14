import { useMemo } from 'react';
import { formatDistanceToNow, subDays } from 'date-fns';
import { ArrowDown } from 'lucide-react';
import { useQuery } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { PageLead } from '@/components/base/page-lead';
import { ALERTS_POLL_INTERVAL_MS } from '@/components/target/alerts/alert-polling';
import { BadgeRounded } from '@/components/ui/badge';
import { Avatar } from '@/components/v2/avatar';
import { graphql } from '@/gql';
import {
  AlertChannelType,
  MetricAlertRuleSeverity,
  MetricAlertRuleState,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useRollingNow } from '@/lib/hooks/use-rolling-now';
import { useNavigate } from '@tanstack/react-router';
import { createColumnHelper, type Column, type ColumnDef } from '@tanstack/react-table';

const TargetAlertsRulesPage_Query = graphql(`
  query TargetAlertsRulesPage_Query(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $from: DateTime!
    $to: DateTime!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      metricAlertRulesLimit
      metricAlertRules {
        id
        name
        type
        severity
        state
        enabled
        lastTriggeredAt
        updatedAt
        eventCount(from: $from, to: $to)
        channels {
          id
          type
        }
        createdBy {
          id
          displayName
        }
      }
    }
  }
`);

type RuleRow = {
  id: string;
  name: string;
  type: MetricAlertRuleType;
  severity: MetricAlertRuleSeverity;
  state: MetricAlertRuleState;
  enabled: boolean;
  lastTriggeredAt?: string | null;
  updatedAt: string;
  eventCount: number;
  channels: ReadonlyArray<{ id: string; type: string }>;
  createdBy?: { id: string; displayName: string } | null;
};

const TYPE_LABEL: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'Reliability',
  [MetricAlertRuleType.Latency]: 'Latency',
  [MetricAlertRuleType.Traffic]: 'Traffic',
};

const SEVERITY_DOT_COLOR: Record<MetricAlertRuleSeverity, 'critical' | 'warning' | 'info'> = {
  [MetricAlertRuleSeverity.Critical]: 'critical',
  [MetricAlertRuleSeverity.Warning]: 'warning',
  [MetricAlertRuleSeverity.Info]: 'info',
};

const SEVERITY_LABEL: Record<MetricAlertRuleSeverity, string> = {
  [MetricAlertRuleSeverity.Critical]: 'Critical',
  [MetricAlertRuleSeverity.Warning]: 'Warning',
  [MetricAlertRuleSeverity.Info]: 'Info',
};

const SEVERITY_RANK: Record<MetricAlertRuleSeverity, number> = {
  [MetricAlertRuleSeverity.Critical]: 3,
  [MetricAlertRuleSeverity.Warning]: 2,
  [MetricAlertRuleSeverity.Info]: 1,
};

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  [AlertChannelType.Slack]: 'Slack',
  [AlertChannelType.Webhook]: 'Webhook',
  [AlertChannelType.MsteamsWebhook]: 'MS Teams',
};

function destinationLabel(channels: ReadonlyArray<{ type: string }>): string {
  if (channels.length === 0) return '—';
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const c of channels) {
    if (!counts.has(c.type)) order.push(c.type);
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  }
  return order
    .map(type => {
      const label = CHANNEL_TYPE_LABEL[type] ?? type;
      const count = counts.get(type) ?? 0;
      return count > 1 ? `${label} (${count})` : label;
    })
    .join(', ');
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function SortableHeader({ column, label }: { column: Column<RuleRow, unknown>; label: string }) {
  const sort = column.getIsSorted();
  const arrowOpacity = sort ? 'opacity-100' : 'opacity-30';
  const arrowRotation = sort === 'asc' ? 'rotate-180' : '';
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting()}
      className="text-neutral-10 hover:text-neutral-12 inline-flex items-center gap-1 text-xs font-medium"
    >
      {label}
      <ArrowDown className={`size-3 transition-transform ${arrowOpacity} ${arrowRotation}`} />
    </button>
  );
}

const columnHelper = createColumnHelper<RuleRow>();

const RULE_COLUMNS: ColumnDef<RuleRow, any>[] = [
  columnHelper.accessor('name', {
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
    cell: info => <span className="text-neutral-12 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => (
      <span className="text-neutral-11">{TYPE_LABEL[info.getValue() as MetricAlertRuleType]}</span>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('severity', {
    header: ({ column }) => <SortableHeader column={column} label="Severity" />,
    sortingFn: (a, b) => SEVERITY_RANK[a.original.severity] - SEVERITY_RANK[b.original.severity],
    cell: info => {
      const sev = info.getValue() as MetricAlertRuleSeverity;
      return (
        <span className="text-neutral-12 inline-flex items-center gap-1.5">
          <BadgeRounded color={SEVERITY_DOT_COLOR[sev]} className="size-2" />
          {SEVERITY_LABEL[sev]}
        </span>
      );
    },
  }),
  columnHelper.accessor('eventCount', {
    header: ({ column }) => <SortableHeader column={column} label="Events" />,
    cell: info => <span className="text-neutral-12 font-mono">{info.getValue()}</span>,
  }),
  columnHelper.accessor('lastTriggeredAt', {
    header: ({ column }) => <SortableHeader column={column} label="Last triggered" />,
    sortingFn: (a, b) => {
      const av = a.original.lastTriggeredAt ? new Date(a.original.lastTriggeredAt).getTime() : 0;
      const bv = b.original.lastTriggeredAt ? new Date(b.original.lastTriggeredAt).getTime() : 0;
      return av - bv;
    },
    cell: info => (
      <span className="text-neutral-11 font-mono text-xs">{relativeTime(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
    header: ({ column }) => <SortableHeader column={column} label="Last updated" />,
    sortingFn: (a, b) =>
      new Date(a.original.updatedAt).getTime() - new Date(b.original.updatedAt).getTime(),
    cell: info => (
      <span className="text-neutral-11 font-mono text-xs">{relativeTime(info.getValue())}</span>
    ),
  }),
  columnHelper.display({
    id: 'destination',
    header: 'Destination',
    cell: ctx => (
      <span className="text-neutral-12">{destinationLabel(ctx.row.original.channels)}</span>
    ),
  }),
  columnHelper.display({
    id: 'createdBy',
    header: 'Created by',
    cell: ctx => {
      const u = ctx.row.original.createdBy;
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

function UsageChip({ used, limit }: { used: number; limit: number }) {
  const ratio = limit > 0 ? used / limit : 0;
  const color =
    used >= limit
      ? 'border-critical_30 bg-critical_08 text-critical'
      : ratio >= 0.8
        ? 'border-warning/40 bg-warning/10 text-warning'
        : 'border-neutral-5 bg-neutral-3 text-neutral-11';
  const label = `${used} / ${limit} rules`;
  const title =
    used >= limit
      ? 'Limit reached. Delete a rule to free a slot.'
      : `${used} of ${limit} configured rules used.`;
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${color}`}
    >
      {label}
    </span>
  );
}

export function TargetAlertsRulesPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  const navigate = useNavigate();

  const now = useRollingNow(ALERTS_POLL_INTERVAL_MS);
  const { from, to } = useMemo(
    () => ({ from: subDays(now, 90).toISOString(), to: now.toISOString() }),
    [now],
  );

  const [result] = useQuery({
    query: TargetAlertsRulesPage_Query,
    variables: { organizationSlug, projectSlug, targetSlug, from, to },
  });

  const data = useKeepPreviousData(result.data, result.fetching || result.stale);
  const rules: RuleRow[] = useMemo(
    () =>
      (data?.target?.metricAlertRules ?? []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        severity: r.severity,
        state: r.state,
        enabled: r.enabled,
        lastTriggeredAt: r.lastTriggeredAt,
        updatedAt: r.updatedAt,
        eventCount: r.eventCount,
        channels: r.channels.map(c => ({ id: c.id, type: c.type })),
        createdBy: r.createdBy
          ? { id: r.createdBy.id, displayName: r.createdBy.displayName }
          : null,
      })),
    [data?.target?.metricAlertRules],
  );
  const limit = data?.target?.metricAlertRulesLimit;

  return (
    <>
      <PageLead
        title="Configured alerts"
        description="The following alerts are currently active for this target."
        titleAccessory={
          limit !== undefined ? <UsageChip used={rules.length} limit={limit} /> : null
        }
      />

      {result.fetching && !data ? (
        <p className="text-neutral-10 text-sm">Loading…</p>
      ) : (
        <DataTable
          data={rules}
          columns={RULE_COLUMNS}
          getRowId={r => r.id}
          emptyMessage="No alerts configured yet."
          onRowClick={r => {
            void navigate({
              to: '/$organizationSlug/$projectSlug/$targetSlug/alerts/$ruleId',
              params: { organizationSlug, projectSlug, targetSlug, ruleId: r.id },
            });
          }}
        />
      )}
    </>
  );
}
