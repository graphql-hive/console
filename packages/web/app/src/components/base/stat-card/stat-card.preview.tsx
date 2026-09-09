import {
  ActivityIcon,
  BookIcon,
  FrownIcon,
  GaugeIcon,
  GlobeIcon,
  PercentIcon,
  SmileIcon,
} from 'lucide-react';
import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { StatCard } from './stat-card';

export const nav: NavPath = 'Base/Primitives/StatCard';

/**
 * The shape all 17 insights stat cards share. `raised` is the surface they ship on; the one
 * outlier (target-insights-manage-filters.tsx) uses `base` with a muted title and no icon.
 */
export const Default = createPreview(() => (
  <StatCard
    variants={{ onSurface: 'raised' }}
    title="Requests"
    icon={GlobeIcon}
    value="482,100"
    caption="Total requests served"
  />
));

/**
 * Success and failure rate are the only call sites that colour the title. Worth checking both
 * themes: emerald-500 and red-500 are fixed colours, so they do not shift with the surface.
 */
export const Tones = createPreview(() => (
  <div className="grid w-[46rem] grid-cols-2 gap-4">
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Requests (default)"
      icon={GlobeIcon}
      value="482,100"
      caption="Total requests served"
    />
    <StatCard
      variants={{ onSurface: 'raised', tone: 'muted' }}
      title="Requests (muted)"
      icon={GlobeIcon}
      value="482,100"
      caption="Total requests served"
    />
    <StatCard
      variants={{ onSurface: 'raised', tone: 'success' }}
      title="Success rate"
      icon={SmileIcon}
      value="99.2%"
      caption="Successful requests in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised', tone: 'danger' }}
      title="Failure rate"
      icon={FrownIcon}
      value="0.8%"
      caption="Failed requests in last 7 days"
    />
  </div>
));

/**
 * `muted` on the `base` surface with no icon and no caption: the manage-filters outlier, which is
 * the only stat card today that is not `raised`.
 */
export const NoIconNoCaption = createPreview(() => (
  <StatCard variants={{ tone: 'muted' }} title="Total operations" value="18" />
));

/** The coordinate page suffixes the figure with an error count, so `value` takes a node. */
export const NodeValue = createPreview(() => (
  <StatCard
    variants={{ onSurface: 'raised' }}
    title="Total resolutions"
    icon={GlobeIcon}
    value={
      <>
        1,204,880
        <span className="ml-2 text-sm font-normal text-red-500">(3,120 errors)</span>
      </>
    }
    caption="Resolved in last 7 days"
  />
));

/**
 * Replaces the raw HTML `title` attribute the coordinate page used for this. Matches the info-icon
 * pattern already in `components/target/insights/list.tsx` for the Impact column.
 */
export const WithHint = createPreview(() => (
  <StatCard
    variants={{ onSurface: 'raised' }}
    title="Total resolutions"
    icon={GlobeIcon}
    hint={
      <>
        <p className="mb-2">
          Resolution Count is the total number of times this specific field (schema coordinate) was
          executed and returned.
        </p>
        <p>
          This differs from Request Count because a single request can resolve a field multiple
          times (e.g. inside an array) or skip it entirely.
        </p>
      </>
    }
    value="1,204,880"
    caption="Resolved in last 7 days"
  />
));

/**
 * The narrowest column the insights grid produces (`lg:grid-cols-2` inside a `col-span-4`).
 * "Relative Request Frequency" wraps to two lines here, which is the case the icon has to survive.
 */
export const LongTitle = createPreview(() => (
  <div className="w-[15rem]">
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Relative Request Frequency"
      icon={PercentIcon}
      value="15.1%"
      caption="The impact on the overall API traffic"
    />
  </div>
));

/**
 * The full row from the insights page, so the tiles can be checked for a consistent baseline:
 * the value sits at the same height in every card regardless of whether the title wrapped.
 */
export const InsightsRow = createPreview(() => (
  <div className="grid w-[62rem] grid-cols-4 gap-4">
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Requests"
      icon={GlobeIcon}
      value="482,100"
      caption="Total requests served"
    />
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Requests per minute"
      icon={ActivityIcon}
      value="1.2k"
      caption="Throughput in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Relative Request Frequency"
      icon={PercentIcon}
      value="15.1%"
      caption="The impact on the overall API traffic"
    />
    <StatCard
      variants={{ onSurface: 'raised', tone: 'success' }}
      title="Success rate"
      icon={SmileIcon}
      value="99.2%"
      caption="Successful requests in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="p99"
      icon={GaugeIcon}
      value="284ms"
      caption="Latency p99 in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="p95"
      icon={GaugeIcon}
      value="190ms"
      caption="Latency p95 in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised' }}
      title="Operations"
      icon={BookIcon}
      value="18"
      caption="Distinct GraphQL operations in last 7 days"
    />
    <StatCard
      variants={{ onSurface: 'raised', tone: 'danger' }}
      title="Failure rate"
      icon={FrownIcon}
      value="0.8%"
      caption="Failed requests in last 7 days"
    />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    onSurface: { type: 'radio', options: ['base', 'raised'], default: 'raised' },
    tone: { type: 'radio', options: ['default', 'success', 'danger', 'muted'], default: 'default' },
    title: { type: 'text', default: 'Requests' },
    value: { type: 'text', default: '482,100' },
    caption: { type: 'text', default: 'Total requests served' },
    withIcon: { type: 'boolean', default: true },
    withHint: { type: 'boolean', default: false },
  }),
  render: v => (
    <StatCard
      variants={{ onSurface: v.onSurface, tone: v.tone }}
      title={v.title}
      value={v.value}
      caption={v.caption}
      icon={v.withIcon ? GlobeIcon : undefined}
      hint={v.withHint ? 'How this metric is derived.' : undefined}
    />
  ),
});
