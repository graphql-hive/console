import { DeliveryReader } from '../providers/delivery-reader';
import type { DeliveryStatsResolvers } from './../../../__generated__/types';

// The parent resolver authorized the selection. The totals share one ClickHouse query and the two
// series another: the client de-duplicates identical in-flight queries, so selecting both fields
// of a pair costs a single round trip.
export const DeliveryStats: DeliveryStatsResolvers = {
  totalDeliveries: async (stats, _, { injector }) => {
    const totals = await injector
      .get(DeliveryReader)
      .getTotals({ ...stats.selector, period: stats.period });
    return totals.total;
  },
  totalFailures: async (stats, _, { injector }) => {
    const totals = await injector
      .get(DeliveryReader)
      .getTotals({ ...stats.selector, period: stats.period });
    return totals.failed;
  },
  deliveriesOverTime: async (stats, { resolution }, { injector }) => {
    const buckets = await injector
      .get(DeliveryReader)
      .getOverTime({ ...stats.selector, period: stats.period, resolution });
    return buckets.map(bucket => ({ date: bucket.date, value: bucket.total }));
  },
  failuresOverTime: async (stats, { resolution }, { injector }) => {
    const buckets = await injector
      .get(DeliveryReader)
      .getOverTime({ ...stats.selector, period: stats.period, resolution });
    return buckets.map(bucket => ({ date: bucket.date, value: bucket.failed }));
  },
};
