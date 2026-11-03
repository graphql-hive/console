import { useMemo } from 'react';
import { subHours } from 'date-fns';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { BackLink } from '@/components/navigation/back-link';
import { ChannelDeliveriesChart } from '@/components/project/alerts/channel-deliveries-chart';
import {
  ChannelDeliveriesTable,
  type ChannelDeliveryTarget,
} from '@/components/project/alerts/channel-deliveries-table';
import { ChannelDetailsPanel } from '@/components/project/alerts/channel-details-panel';
import { CHANNEL_TYPE_LABEL } from '@/components/project/alerts/channel-form';
import { ChannelHealthWarning } from '@/components/project/alerts/channel-health-warning';
import { ALERTS_POLL_INTERVAL_MS } from '@/components/target/alerts/alert-polling';
import { Callout } from '@/components/ui/callout';
import { Meta } from '@/components/ui/meta';
import { NotFound, resourceAccessDescription } from '@/components/ui/not-found/not-found';
import { PageLead } from '@/components/ui/page-lead';
import { Badge } from '@/components/ui/primitives/badge/badge';
import type { TimeSeries } from '@/components/ui/primitives/chart/time-series-chart';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { StatCard } from '@/components/ui/stat-card/stat-card';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { AlertChannelHealthStatus } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { resolveRangeAndResolution } from '@/lib/hooks/use-date-range-controller';
import { toDecimal } from '@/lib/hooks/use-decimal';
import { formatNumber } from '@/lib/hooks/use-formatted-number';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useRollingNow } from '@/lib/hooks/use-rolling-now';
import { useNavigate } from '@tanstack/react-router';

// The channel's configuration, revalidated by the route; the live delivery data below is the
// section's own polling query, so the panel is never torn down while it refreshes.
export const ProjectAlertChannelPage_ChannelQuery = graphql(`
  query ProjectAlertChannelPage_ChannelQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $channelId: ID!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      alertChannel(id: $channelId) {
        id
        name
        type
        ...ChannelDetailsPanel_AlertChannelFragment
      }
      targets {
        edges {
          node {
            id
            slug
          }
        }
      }
    }
  }
`);

const ProjectAlertChannelPage_DeliveriesQuery = graphql(`
  query ProjectAlertChannelPage_DeliveriesQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $channelId: ID!
    $period: DateRangeInput!
    $resolution: Int!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      alertChannel(id: $channelId) {
        id
        deliveryHealth {
          status
          lastSuccessAt
          lastFailureAt
          lastStatusCode
          lastStatusText
          failingSince
        }
        deliveryStats(period: $period) {
          totalDeliveries
          totalFailures
          deliveriesOverTime(resolution: $resolution) {
            date
            value
          }
          failuresOverTime(resolution: $resolution) {
            date
            value
          }
        }
        deliveryLog(period: $period, limit: 50) {
          timestamp
          event
          ok
          statusCode
          statusText
          durationMs
          attempt
          metadata
        }
      }
    }
  }
`);

/** The page always shows the most recent two days of deliveries. */
const DELIVERY_WINDOW_HOURS = 48;
const DELIVERY_WINDOW_LABEL = `the last ${DELIVERY_WINDOW_HOURS} hours`;

export function ProjectAlertChannelPage(props: { channelId: string }) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const navigate = useNavigate();

  const [result] = useQuery({
    query: ProjectAlertChannelPage_ChannelQuery,
    variables: { organizationSlug, projectSlug, channelId: props.channelId },
  });

  const channel = result.data?.project?.alertChannel;
  const targets = useMemo(
    () => result.data?.project?.targets.edges.map(edge => edge.node) ?? [],
    [result.data],
  );

  // Only surface the error when there's nothing cached to fall back on.
  if (result.error && !result.data) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center py-28">
        <div className="text-sm text-critical">
          Failed to load alert channel: {result.error.message}
        </div>
      </div>
    );
  }

  if (!channel && (result.fetching || result.stale)) {
    return (
      <div className="flex h-fit flex-1 items-center justify-center py-28">
        <Spinner />
      </div>
    );
  }

  if (!channel) {
    return (
      <NotFound
        variants={{ layout: 'horizontal', illustration: 'connection' }}
        title="Alert channel not found"
        description={resourceAccessDescription}
      />
    );
  }

  return (
    <>
      <Meta title={`${channel.name} | Alerts`} />
      <LayoutContent>
        <div className="flex flex-col gap-8 pt-7 xl:flex-row">
          <div className="min-w-0 flex-1 space-y-6">
            <BackLink
              copy="Back to Alerts"
              link={{
                to: '/$organizationSlug/$projectSlug/view/alerts',
                params: { organizationSlug, projectSlug },
              }}
            />

            <PageLead
              title={channel.name}
              description={`Notifications Hive sent to this channel in ${DELIVERY_WINDOW_LABEL}, with the response each one received.`}
              titleAccessory={
                <Badge
                  content={CHANNEL_TYPE_LABEL[channel.type]}
                  variants={{ variant: 'secondary' }}
                />
              }
            />

            <ChannelDeliveriesSection channelId={channel.id} targets={targets} />
          </div>

          <aside className="shrink-0 self-start xl:sticky xl:top-6 xl:w-94">
            <ChannelDetailsPanel
              channel={channel}
              onChannelDeleted={() => {
                void navigate({
                  to: '/$organizationSlug/$projectSlug/view/alerts',
                  params: { organizationSlug, projectSlug },
                });
              }}
            />
          </aside>
        </div>
      </LayoutContent>
    </>
  );
}

function ChannelDeliveriesSection(props: { channelId: string; targets: ChannelDeliveryTarget[] }) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const now = useRollingNow(ALERTS_POLL_INTERVAL_MS);
  const { from, to, resolution } = useMemo(() => {
    const resolved = resolveRangeAndResolution({
      from: subHours(now, DELIVERY_WINDOW_HOURS),
      to: now,
    });
    return {
      from: resolved.range.from.toISOString(),
      to: resolved.range.to.toISOString(),
      resolution: resolved.resolution,
    };
  }, [now]);

  const [result] = useQuery({
    query: ProjectAlertChannelPage_DeliveriesQuery,
    variables: {
      organizationSlug,
      projectSlug,
      channelId: props.channelId,
      period: { from, to },
      resolution,
    },
    requestPolicy: 'cache-and-network',
  });

  const data = useKeepPreviousData(result.data, result.fetching || result.stale);
  const channel = data?.project?.alertChannel ?? null;
  const hasNoData = !data;
  const status =
    result.error && hasNoData ? (
      <div className="py-4 text-sm text-critical">
        Failed to load deliveries: {result.error.message}
      </div>
    ) : result.fetching && hasNoData ? (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    ) : null;
  // The delivery fields are null when ClickHouse could not be read; the channel itself still loads.
  const partiallyUnavailable =
    !!channel &&
    (channel.deliveryHealth === null ||
      channel.deliveryStats === null ||
      channel.deliveryLog === null);

  return (
    <>
      <ChannelHealthWarning health={channel?.deliveryHealth ?? null} now={now} />

      {status ?? (
        <>
          {partiallyUnavailable ? (
            <Callout type="error" className="mt-0">
              Some delivery data is unavailable right now
              {result.error ? `: ${result.error.message}` : '.'}
            </Callout>
          ) : null}

          <DeliveryStatCards
            stats={channel?.deliveryStats ?? null}
            health={channel?.deliveryHealth ?? null}
          />

          <DeliveryCharts stats={channel?.deliveryStats ?? null} />

          <section className="space-y-2">
            <ChannelDeliveriesTable
              deliveries={channel?.deliveryLog ?? null}
              targets={props.targets}
            />
          </section>
        </>
      )}
    </>
  );
}

type DeliveryStats = {
  totalDeliveries: number;
  totalFailures: number;
  deliveriesOverTime: ReadonlyArray<{ date: string; value: number }>;
  failuresOverTime: ReadonlyArray<{ date: string; value: number }>;
};

type DeliveryHealth = {
  status: AlertChannelHealthStatus;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastStatusCode?: number | null;
  lastStatusText?: string | null;
};

function DeliveryStatCards({
  stats,
  health,
}: {
  stats: DeliveryStats | null;
  health: DeliveryHealth | null;
}) {
  if (!stats && !health) {
    return null;
  }

  const errorRate =
    stats && stats.totalDeliveries > 0
      ? `${toDecimal((stats.totalFailures * 100) / stats.totalDeliveries)}%`
      : '-';
  const lastResponse = health
    ? [health.lastStatusCode, health.lastStatusText].filter(Boolean).join(' ')
    : '';

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard
        title="Deliveries"
        value={stats ? formatNumber(stats.totalDeliveries) : '-'}
        caption={`in ${DELIVERY_WINDOW_LABEL}`}
      />
      <StatCard
        title="Failed"
        value={stats ? formatNumber(stats.totalFailures) : '-'}
        caption={`in ${DELIVERY_WINDOW_LABEL}`}
        variants={{ tone: stats && stats.totalFailures > 0 ? 'danger' : 'default' }}
      />
      <StatCard
        title="Error rate"
        value={errorRate}
        caption={`in ${DELIVERY_WINDOW_LABEL}`}
        variants={{ tone: stats && stats.totalFailures > 0 ? 'danger' : 'default' }}
      />
      <StatCard
        title="Last success"
        value={health?.lastSuccessAt ? <TimeAgo date={health.lastSuccessAt} /> : 'Never'}
        caption={
          health?.lastFailureAt ? (
            <>
              Last failure <TimeAgo date={health.lastFailureAt} />
              {lastResponse ? ` · ${lastResponse}` : null}
            </>
          ) : undefined
        }
        variants={{
          tone:
            health?.status === AlertChannelHealthStatus.Failing
              ? 'danger'
              : health?.status === AlertChannelHealthStatus.Healthy
                ? 'success'
                : 'default',
        }}
      />
    </div>
  );
}

function DeliveryCharts({ stats }: { stats: DeliveryStats | null }) {
  const series = useMemo(() => {
    const deliveries = stats?.deliveriesOverTime ?? [];
    const failures = stats?.failuresOverTime ?? [];
    const total: TimeSeries['data'] = deliveries.map(point => [point.date, point.value]);
    const errors: TimeSeries['data'] = failures.map(point => [point.date, point.value]);
    return { total, errors };
  }, [stats]);

  if (!stats) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="m-0 text-sm font-medium text-fg">Deliveries over time</h2>
      <p className="m-0 text-sm text-fg-secondary">
        Attempts and failures per interval, over {DELIVERY_WINDOW_LABEL}.
      </p>
      {series.total.length === 0 ? (
        // Zero deliveries still draw as a flat line, like the rule page; the box is for no buckets at all.
        <div className="flex h-[200px] items-center justify-center rounded-md border border-line bg-surface-card">
          <span className="text-sm text-fg-subtle italic">No data available for this range.</span>
        </div>
      ) : (
        <ChannelDeliveriesChart deliveries={series.total} errors={series.errors} />
      )}
    </section>
  );
}
