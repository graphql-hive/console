import { AlertsManager } from '../providers/alerts-manager';
import type { AlertChannelDeliveryStatsResolvers } from './../../../__generated__/types';

// The totals share one ClickHouse query and the two series another: the client de-duplicates
// identical in-flight queries, so selecting both fields of a pair costs a single round trip.
export const AlertChannelDeliveryStats: AlertChannelDeliveryStatsResolvers = {
  totalDeliveries: async (stats, _, { injector }) => {
    const totals = await injector.get(AlertsManager).getChannelDeliveryTotals(stats);
    return totals.total;
  },
  totalFailures: async (stats, _, { injector }) => {
    const totals = await injector.get(AlertsManager).getChannelDeliveryTotals(stats);
    return totals.failed;
  },
  deliveriesOverTime: async (stats, { resolution }, { injector }) => {
    const buckets = await injector
      .get(AlertsManager)
      .getChannelDeliveriesOverTime({ ...stats, resolution });
    return buckets.map(bucket => ({ date: bucket.date, value: bucket.total }));
  },
  failuresOverTime: async (stats, { resolution }, { injector }) => {
    const buckets = await injector
      .get(AlertsManager)
      .getChannelDeliveriesOverTime({ ...stats, resolution });
    return buckets.map(bucket => ({ date: bucket.date, value: bucket.failed }));
  },
};
