import { useMemo } from 'react';
import { useQuery } from 'urql';
import { DeliveriesOverTime } from '@/components/common/deliveries/deliveries-over-time';
import { DeliveryStatCards } from '@/components/common/deliveries/delivery-stat-cards';
import {
  DELIVERY_WINDOW_LABEL,
  useDeliveryWindow,
} from '@/components/common/deliveries/use-delivery-window';
import { LayoutContent } from '@/components/layouts/layout-content';
import { BackLink } from '@/components/navigation/back-link';
import {
  ChannelDeliveriesTable,
  type ChannelDeliveryTarget,
} from '@/components/project/alerts/channel-deliveries-table';
import { ChannelDetailsPanel } from '@/components/project/alerts/channel-details-panel';
import { ChannelDisabledNotice } from '@/components/project/alerts/channel-disabled-notice';
import { CHANNEL_TYPE_LABEL } from '@/components/project/alerts/channel-form';
import { ChannelHealthWarning } from '@/components/project/alerts/channel-health-warning';
import { CHANNEL_DELIVERIES_POLL_INTERVAL_MS } from '@/components/project/alerts/channel-polling';
import { Callout } from '@/components/ui/callout';
import { Meta } from '@/components/ui/meta';
import { NotFound, resourceAccessDescription } from '@/components/ui/not-found/not-found';
import { PageLead } from '@/components/ui/page-lead';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useRefetchOnTick } from '@/lib/hooks/use-refetch-on-tick';
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
        disabledAt
        disabledBy {
          id
        }
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
              description="Channel details and audit log. We do not store the response payload and only certain headers are tracked for security purposes."
              titleAccessory={
                <Badge
                  content={CHANNEL_TYPE_LABEL[channel.type]}
                  variants={{ variant: 'secondary' }}
                />
              }
            />

            <ChannelDeliveriesSection
              channelId={channel.id}
              disabled={
                channel.disabledAt
                  ? { at: channel.disabledAt, byHive: channel.disabledBy == null }
                  : null
              }
              targets={targets}
            />
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

function ChannelDeliveriesSection(props: {
  channelId: string;
  disabled: { at: string; byHive: boolean } | null;
  targets: ChannelDeliveryTarget[];
}) {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const { now, from, to, resolution } = useDeliveryWindow(CHANNEL_DELIVERIES_POLL_INTERVAL_MS);

  const [result, reexecuteQuery] = useQuery({
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
  useRefetchOnTick(now, reexecuteQuery);

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
      {props.disabled ? (
        // A member's pause needs no explanation; Hive's does.
        props.disabled.byHive ? (
          <ChannelDisabledNotice channelId={props.channelId} disabledAt={props.disabled.at} />
        ) : null
      ) : (
        <ChannelHealthWarning health={channel?.deliveryHealth ?? null} now={now} />
      )}

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
            windowLabel={DELIVERY_WINDOW_LABEL}
            headline={{ title: 'Total calls' }}
          />

          <DeliveriesOverTime
            stats={channel?.deliveryStats ?? null}
            title="Deliveries over time"
            description={`Total calls and failures per interval, over ${DELIVERY_WINDOW_LABEL}`}
            totalLabel="Total calls"
          />

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
