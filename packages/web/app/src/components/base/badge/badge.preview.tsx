import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Badge } from './badge';

export const nav: NavPath = 'Base/Badge';

export const Variants = createPreview(() => (
  <div className="flex items-center gap-3">
    <Badge>Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
));

export const InContext = createPreview(() => (
  <div className="flex flex-col gap-3 text-sm">
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">production</span>
      <Badge variant="secondary">3 subgraphs</Badge>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">checkout-service</span>
      <Badge variant="destructive">breaking</Badge>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-neutral-11">v2.4.0</span>
      <Badge variant="outline">latest</Badge>
    </div>
  </div>
));

export const Truncation = createPreview(() => (
  <div className="w-48">
    <Badge variant="secondary">a-very-long-badge-label-that-overflows</Badge>
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    children: { type: 'text', default: 'Badge' },
    variant: {
      type: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      default: 'default',
    },
  }),
  render: v => <Badge variant={v.variant}>{v.children}</Badge>,
});
