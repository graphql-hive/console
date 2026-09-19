import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Badge } from './badge';

export const nav: NavPath = 'Base/Primitives/Badge';

/**
 * Three neutral variants and four semantic ones. The semantic pills are tinted, a 10% fill of the
 * token under its text, which is what `v2/tag` did and what the traces Ok / Error pills built by
 * hand; the solid emerald, yellow and red fills of `ui/badge` are gone.
 */
export const Variants = createPreview(() => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge content="Default" />
    <Badge content="Secondary" variants={{ variant: 'secondary' }} />
    <Badge content="Outline" variants={{ variant: 'outline' }} />
    <Badge content="Allowed" variants={{ variant: 'success' }} />
    <Badge content="Allowed" variants={{ variant: 'warning' }} />
    <Badge content="Denied" variants={{ variant: 'critical' }} />
    <Badge content="Info" variants={{ variant: 'info' }} />
  </div>
));

/** `sm` is the count pill: beside a tab label, or at the end of a filter row. */
export const Sizes = createPreview(() => (
  <div className="flex items-center gap-6 text-sm">
    <span className="inline-flex items-center gap-2">
      Attributes
      <Badge content="12" variants={{ variant: 'secondary', size: 'sm' }} />
    </span>
    <span className="inline-flex items-center gap-2">
      Attributes
      <Badge content="12" variants={{ variant: 'secondary' }} />
    </span>
  </div>
));

/** `mono` for an identifier rather than a word: a permission key, a resource id. */
export const Mono = createPreview(() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge content="organization:describe" variants={{ variant: 'outline', mono: true }} />
    <Badge content="project:describe" variants={{ variant: 'outline', mono: true }} />
    <Badge content="No targets selected." variants={{ variant: 'critical', mono: true }} />
    <Badge content="1,204" variants={{ variant: 'secondary', size: 'sm', mono: true }} />
  </div>
));

export const InContext = createPreview(() => (
  <div className="flex flex-col gap-3 text-sm">
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">production</span>
      <Badge content="3 subgraphs" variants={{ variant: 'secondary' }} />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">checkout-service</span>
      <Badge content="breaking" variants={{ variant: 'critical' }} />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">v2.4.0</span>
      <Badge content="latest" variants={{ variant: 'outline' }} />
    </div>
  </div>
));

/**
 * `outline` is a step lighter than the filled variants, which is what the two qualifying call
 * sites ("3 mappings", "+2 more") were reaching for with a `font-normal` class of their own.
 */
export const Weights = createPreview(() => (
  <div className="flex items-center gap-3">
    <Badge content="font-medium" />
    <Badge content="font-normal" variants={{ variant: 'outline' }} />
  </div>
));

export const Truncation = createPreview(() => (
  <div className="w-48">
    <Badge content="a-very-long-badge-label-that-overflows" variants={{ variant: 'secondary' }} />
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Badge, {
    content: { type: 'text', default: 'Badge' },
    variants: {
      variant: {
        type: 'select',
        options: ['default', 'secondary', 'outline', 'success', 'warning', 'critical', 'info'],
        default: 'default',
      },
      size: { type: 'radio', options: ['default', 'sm'], default: 'default' },
      mono: { type: 'boolean', default: false },
    },
  }),
  render: v => <Badge content={v.content} variants={v.variants} />,
});
