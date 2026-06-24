import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import { DescriptionList } from '@/components/base/description-list/description-list';
import { FloatingPortalContainerProvider } from '@/components/base/floating/floating-portal-container';
import { savedFilterToSearchParams } from '@/components/target/insights/search-params';
import { BadgeRounded } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar } from '@/components/v2/avatar';
import {
  AlertChannelType,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { formatDuration } from '@/lib/hooks/use-formatted-duration';
import { Link } from '@tanstack/react-router';
import { AlertForm, ruleToFormDefaults } from './alert-form';
import { AlertRuleEnabledToggle } from './alert-rule-enabled-toggle';
import { DeleteRuleConfirmationDialog } from './delete-rule-confirmation-dialog';

const TYPE_CATEGORY: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'Reliability',
  [MetricAlertRuleType.Latency]: 'Performance',
  [MetricAlertRuleType.Traffic]: 'Traffic',
};

const METRIC_LABEL_BY_TYPE: Record<MetricAlertRuleType, string> = {
  [MetricAlertRuleType.ErrorRate]: 'Error rate',
  [MetricAlertRuleType.Latency]: 'Latency',
  [MetricAlertRuleType.Traffic]: 'Total requests',
};

const THRESHOLD_TYPE_LABEL: Record<MetricAlertRuleThresholdType, string> = {
  [MetricAlertRuleThresholdType.FixedValue]: 'Fixed value',
  [MetricAlertRuleThresholdType.PercentageChange]: '% change vs. previous',
};

const SEVERITY_DOT_COLOR: Record<MetricAlertRuleSeverity, 'critical' | 'warning' | 'info'> = {
  [MetricAlertRuleSeverity.Critical]: 'critical',
  [MetricAlertRuleSeverity.Warning]: 'warning',
  [MetricAlertRuleSeverity.Info]: 'info',
};

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  [AlertChannelType.Slack]: 'Slack',
  [AlertChannelType.Webhook]: 'Webhook',
  [AlertChannelType.MsteamsWebhook]: 'MS Teams',
};

function destinationLabel(channels: ReadonlyArray<{ type: string }>): string {
  if (channels.length === 0) return '—';
  // Group by type, preserve first-seen order, suffix with a count when there are multiples.
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

function formatTimeWindow(minutes: number): string {
  if (minutes >= 24 * 60) {
    const days = minutes / (24 * 60);
    return `last ${days === 1 ? '1 day' : `${days} days`}`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `last ${hours === 1 ? '1 hour' : `${hours} hours`}`;
  }
  return `last ${minutes === 1 ? '1 minute' : `${minutes} minutes`}`;
}

type Channel = { id: string; name: string; type: string };
type User = { id: string; displayName: string } | null | undefined;

type SavedFilter = {
  id: string;
  name: string;
  filters: {
    operationHashes: string[];
    clientFilters: ReadonlyArray<{ name: string; versions?: string[] | null }>;
    dateRange?: { from: string; to: string } | null;
    excludeOperations?: boolean | null;
    excludeClientFilters?: boolean | null;
  };
};

export type AlertConditionsPanelProps = {
  rule: {
    id: string;
    name: string;
    type: MetricAlertRuleType;
    metric?: string | null;
    severity: MetricAlertRuleSeverity;
    enabled: boolean;
    direction: string;
    thresholdType: MetricAlertRuleThresholdType;
    thresholdValue: number;
    timeWindowMinutes: number;
    confirmationMinutes: number;
    channels: ReadonlyArray<Channel>;
    savedFilter?: SavedFilter | null;
    createdAt: string;
    createdBy?: User;
    updatedAt: string;
    updatedBy?: User;
  };
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  /**
   * Called after the user confirms a delete via the Delete-rule dialog. The
   * page that hosts this panel is responsible for navigation (typically back
   * to the rules list) and any query invalidation.
   */
  onRuleDeleted?: () => void;
};

function RelativeTimestamp({ iso }: { iso: string }) {
  return (
    <span className="text-neutral-12 inline-flex items-center gap-1 font-mono text-[10px]">
      {formatDistanceToNow(new Date(iso), { addSuffix: true })}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="text-neutral-10 size-3" />
          </TooltipTrigger>
          <TooltipContent>
            <span className="text-xs">{new Date(iso).toUTCString()}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

function UserCell({ user }: { user: User }) {
  if (!user) return <>—</>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar size="xs" shape="circle" alt={user.displayName} />
      <span>{user.displayName}</span>
    </span>
  );
}

export function AlertConditionsPanel({
  rule,
  organizationSlug,
  projectSlug,
  targetSlug,
  onRuleDeleted,
}: AlertConditionsPanelProps) {
  const metricLabel =
    rule.type === MetricAlertRuleType.Latency && rule.metric
      ? `${rule.metric.toLowerCase()} latency`
      : METRIC_LABEL_BY_TYPE[rule.type];

  const thresholdDisplay =
    rule.thresholdType === MetricAlertRuleThresholdType.PercentageChange
      ? `${Math.abs(rule.thresholdValue)}%`
      : rule.type === MetricAlertRuleType.Latency
        ? formatDuration(rule.thresholdValue, true)
        : rule.type === MetricAlertRuleType.ErrorRate
          ? `${rule.thresholdValue}%`
          : String(rule.thresholdValue);

  const conditionLabel =
    rule.thresholdType === MetricAlertRuleThresholdType.PercentageChange
      ? rule.direction.toUpperCase() === 'BELOW'
        ? 'decrease'
        : 'increase'
      : rule.direction.toLowerCase();

  const destination = destinationLabel(rule.channels);

  const onFilterValue = rule.savedFilter ? (
    <Link
      to="/$organizationSlug/$projectSlug/$targetSlug/insights"
      params={{ organizationSlug, projectSlug, targetSlug }}
      search={savedFilterToSearchParams({
        id: rule.savedFilter.id,
        filters: {
          operationHashes: rule.savedFilter.filters.operationHashes,
          clientFilters: rule.savedFilter.filters.clientFilters,
          dateRange: rule.savedFilter.filters.dateRange,
          excludeOperations: rule.savedFilter.filters.excludeOperations ?? undefined,
          excludeClientFilters: rule.savedFilter.filters.excludeClientFilters ?? undefined,
        },
      })}
      target="_blank"
      rel="noreferrer"
      className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
    >
      {rule.savedFilter.name}
      <ExternalLink className="size-3" />
    </Link>
  ) : (
    '—'
  );

  return (
    <div className="border-neutral-5 bg-neutral-2 space-y-6 border-l px-5 py-3">
      <h2 className="text-neutral-12 mb-2 block text-sm font-semibold">Alert conditions</h2>

      <DescriptionList
        rows={[
          {
            items: [
              { term: 'Range', description: formatTimeWindow(rule.timeWindowMinutes) },
              { term: 'Metric', description: metricLabel },
            ],
          },
          {
            items: [
              { term: 'Type', description: TYPE_CATEGORY[rule.type] },
              {
                term: 'Severity',
                description: (
                  <span className="inline-flex items-center gap-0.5">
                    <BadgeRounded color={SEVERITY_DOT_COLOR[rule.severity]} className="size-2" />
                    <span className="capitalize">{rule.severity.toLowerCase()}</span>
                  </span>
                ),
              },
            ],
          },
          {
            items: [
              {
                term: 'Condition',
                description: <span className="capitalize">{conditionLabel}</span>,
              },
              {
                term: 'Threshold type',
                description: THRESHOLD_TYPE_LABEL[rule.thresholdType],
              },
            ],
          },
          {
            items: [
              { term: 'Value', description: thresholdDisplay },
              { term: 'Hold minutes', description: rule.confirmationMinutes },
            ],
          },
          {
            items: [{ term: 'On filter', description: onFilterValue }],
          },
          {
            items: [{ term: 'Destination', description: destination }],
          },
          {
            items: [
              { term: 'Created at', description: <RelativeTimestamp iso={rule.createdAt} /> },
              { term: 'Created by', description: <UserCell user={rule.createdBy} /> },
            ],
          },
          {
            items: [
              { term: 'Last updated', description: <RelativeTimestamp iso={rule.updatedAt} /> },
              { term: 'Updated by', description: <UserCell user={rule.updatedBy} /> },
            ],
          },
        ]}
      />

      <label className="border-neutral-5 flex cursor-pointer items-center justify-between border-y py-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-neutral-12 text-sm font-medium">Alert status</span>
          <span className="text-neutral-10 text-xs">
            {rule.enabled ? 'Notifications are active' : 'Notifications are paused'}
          </span>
        </span>
        <AlertRuleEnabledToggle
          ruleId={rule.id}
          enabled={rule.enabled}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      </label>

      <div className="flex items-center gap-2">
        <ModifyAlertSheet
          rule={rule}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
        <DeleteRuleButton
          ruleId={rule.id}
          ruleName={rule.name}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          onDeleted={onRuleDeleted}
        />
      </div>
    </div>
  );
}

function ModifyAlertSheet({
  rule,
  organizationSlug,
  projectSlug,
  targetSlug,
}: {
  rule: AlertConditionsPanelProps['rule'];
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button label="Modify this alert" onClick={() => setOpen(true)} />
      <SheetContent
        ref={setContentEl}
        side="right"
        className="flex max-h-screen w-[640px] min-w-[600px] flex-col overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Modify alert</SheetTitle>
          <SheetDescription>
            Update the conditions and destinations for this alert.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <FloatingPortalContainerProvider container={contentEl}>
            <AlertForm
              mode="edit"
              ruleId={rule.id}
              organizationSlug={organizationSlug}
              projectSlug={projectSlug}
              targetSlug={targetSlug}
              defaultValues={ruleToFormDefaults(rule)}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </FloatingPortalContainerProvider>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DeleteRuleButton({
  ruleId,
  ruleName,
  organizationSlug,
  projectSlug,
  onDeleted,
}: {
  ruleId: string;
  ruleName: string;
  organizationSlug: string;
  projectSlug: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" label="Delete rule" onClick={() => setOpen(true)} />
      {open ? (
        <DeleteRuleConfirmationDialog
          ruleId={ruleId}
          ruleName={ruleName}
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            onDeleted?.();
          }}
        />
      ) : null}
    </>
  );
}
