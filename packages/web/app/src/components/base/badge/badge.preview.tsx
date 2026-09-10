import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Badge } from './badge';

export const nav: NavPath = 'Base/Primitives/Badge';

export const Variants = createPreview(() => (
  <div className="flex items-center gap-3">
    <Badge content="Default" />
    <Badge content="Secondary" variants={{ variant: 'secondary' }} />
    <Badge content="Destructive" variants={{ variant: 'destructive' }} />
    <Badge content="Outline" variants={{ variant: 'outline' }} />
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
      <Badge content="breaking" variants={{ variant: 'destructive' }} />
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
        options: ['default', 'secondary', 'destructive', 'outline'],
        default: 'default',
      },
    },
  }),
  render: v => <Badge content={v.content} variants={v.variants} />,
});
