import { StatCard } from '@/components/ui/stat-card/stat-card';
import { TimeAgo } from '@/components/ui/time-ago';
import { DeliveryHealthStatus } from '@/gql/graphql';
import { toDecimal } from '@/lib/hooks/use-decimal';
import { formatNumber } from '@/lib/hooks/use-formatted-number';

export type DeliveryStatsData = {
  totalDeliveries: number;
  totalFailures: number;
};

export type DeliveryHealthData = {
  /** Sets the tone of the "Last success" card; without it the card stays neutral. */
  status?: DeliveryHealthStatus;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
};

export type DeliveryHeadline = {
  /** Names every attempt in the window: "Total calls" for a channel, "Emails sent" for email. */
  title: string;
  /** Explains the number, on the info icon after the title. */
  hint?: string;
};

/** The four cards over a deliveries page: the headline count, failures, last success, last failure. */
export function DeliveryStatCards({
  stats,
  health,
  windowLabel,
  headline,
}: {
  stats: DeliveryStatsData | null;
  health: DeliveryHealthData | null;
  windowLabel: string;
  headline: DeliveryHeadline;
}) {
  if (!stats && !health) {
    return null;
  }

  const errorRate =
    stats && stats.totalFailures > 0
      ? `${toDecimal((stats.totalFailures * 100) / stats.totalDeliveries)}%`
      : null;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard
        title={headline.title}
        value={stats ? formatNumber(stats.totalDeliveries) : '-'}
        caption={`in ${windowLabel}`}
        hint={headline.hint}
      />
      <StatCard
        title="Failed"
        value={
          stats ? (
            <>
              {formatNumber(stats.totalFailures)}
              {errorRate ? (
                <span className="ml-2 text-sm font-normal text-critical">({errorRate})</span>
              ) : null}
            </>
          ) : (
            '-'
          )
        }
        caption={`in ${windowLabel}`}
        variants={{ tone: errorRate ? 'danger' : 'default' }}
      />
      <StatCard
        title="Last success"
        value={health?.lastSuccessAt ? <TimeAgo date={health.lastSuccessAt} /> : 'Never'}
        variants={{
          tone:
            health?.status === DeliveryHealthStatus.Failing
              ? 'danger'
              : health?.status === DeliveryHealthStatus.Healthy
                ? 'success'
                : 'default',
        }}
      />
      <StatCard
        title="Last failure"
        value={health?.lastFailureAt ? <TimeAgo date={health.lastFailureAt} /> : 'Never'}
        variants={{ tone: 'danger' }}
      />
    </div>
  );
}
