import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { StatusDot } from './status-dot';

export const nav: NavPath = 'Base/Primitives/StatusDot';

/**
 * One solid dot per state, on the semantic tokens. The old `BadgeRounded` drew a two-tone ring
 * (a 500-shade fill inside a 900-shade border) for its named colours and a flat dot for the
 * semantic ones; this is the flat dot everywhere.
 */
export const Colors = createPreview(() => (
  <div className="text-neutral-11 flex items-center gap-6 text-sm">
    {(['success', 'warning', 'critical', 'info', 'neutral'] as const).map(color => (
      <span key={color} className="inline-flex items-center gap-2">
        <StatusDot color={color} />
        {color}
      </span>
    ))}
  </div>
));

export const Sizes = createPreview(() => (
  <div className="text-neutral-11 flex items-center gap-6 text-sm">
    <span className="inline-flex items-center gap-2">
      <StatusDot color="success" size="sm" />
      sm, 8px
    </span>
    <span className="inline-flex items-center gap-2">
      <StatusDot color="success" />
      default, 12px
    </span>
  </div>
));

/** Beside a label that already names the state, the dot is decoration and hidden from assistive tech. */
export const BesideText = createPreview(() => (
  <div className="flex flex-col gap-2 text-xs">
    <span className="text-neutral-12 inline-flex items-center gap-1.5">
      <StatusDot color="critical" size="sm" />
      Critical
    </span>
    <span className="text-neutral-12 inline-flex items-center gap-1.5">
      <StatusDot color="warning" size="sm" />
      Warning
    </span>
    <span className="text-neutral-12 inline-flex items-center gap-1.5">
      <StatusDot color="info" size="sm" />
      Info
    </span>
  </div>
));

/** Alone, as in the checks list where the dot is the only sign a check failed, it carries a label. */
export const Alone = createPreview(() => (
  <div className="text-neutral-11 flex items-center gap-4 text-sm">
    <StatusDot color="success" label="Passed" />
    <StatusDot color="critical" label="Failed" />
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(StatusDot, {
    color: {
      type: 'select',
      options: ['success', 'warning', 'critical', 'info', 'neutral'],
      default: 'success',
    },
    size: { type: 'radio', options: ['sm', 'default'], default: 'default' },
  }),
  render: v => <StatusDot color={v.color} size={v.size} />,
});
