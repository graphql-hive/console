import { useMemo } from 'react';
import type { TimeSeries } from '@/components/ui/primitives/chart/time-series-chart';
import { DeliveriesChart } from './deliveries-chart';

export type DeliverySeriesData = {
  deliveriesOverTime: ReadonlyArray<{ date: string; value: number }>;
  failuresOverTime: ReadonlyArray<{ date: string; value: number }>;
};

/** The chart section of a deliveries page: attempts and failures per interval over the window. */
export function DeliveriesOverTime({
  stats,
  title,
  description,
  totalLabel,
}: {
  stats: DeliverySeriesData | null;
  title: string;
  description: string;
  totalLabel: string;
}) {
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
      <h2 className="m-0 text-sm font-medium text-fg">{title}</h2>
      <p className="m-0 text-sm text-fg-secondary">{description}</p>
      {series.total.length === 0 ? (
        // Zero deliveries still draw as a flat line, like the rule page; the box is for no buckets at all.
        <div className="flex h-[200px] items-center justify-center rounded-md border border-line bg-surface-card">
          <span className="text-sm text-fg-subtle italic">No data available for this range.</span>
        </div>
      ) : (
        <DeliveriesChart deliveries={series.total} errors={series.errors} totalLabel={totalLabel} />
      )}
    </section>
  );
}
