import { ChevronDown, Copy, ListFilter, Plus, RefreshCw, X } from 'lucide-react';
import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Button } from './button';

export const nav: NavPath = 'Base/Primitives/Button';

export const Variants = createPreview(() => (
  <div className="flex flex-wrap items-center gap-4">
    <Button variant="primary">Save alert</Button>
    <Button variant="outline">Add destination</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="destructive">Delete</Button>
  </div>
));

export const TriggerVariants = createPreview(() => (
  <div className="flex flex-wrap items-center gap-4">
    <Button label="Default" />
    <Button label="Active" variant="active" />
    <Button label="Save this filter view" variant="action" />
    <Button label="Muted action" variant="muted-action" />
  </div>
));

export const Sizes = createPreview(() => (
  <div className="flex items-center gap-4">
    <Button variant="primary">Default</Button>
    <Button variant="primary" size="sm">
      Small
    </Button>
    <Button variant="ghost" size="icon-sm">
      <X className="size-4" />
    </Button>
  </div>
));

export const Segmented = createPreview(() => (
  <div className="flex flex-wrap items-center gap-4">
    <Button label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
    <Button label="Filter" rightIcon={{ icon: ListFilter, withSeparator: false }} />
    <Button label="Copy JSON Schema" rightIcon={{ icon: Copy, withSeparator: true }} />
    <Button
      label="Clients"
      accessoryInformation="3 clients"
      rightIcon={{ icon: X, label: 'Clear clients', withSeparator: true, action: () => {} }}
    />
  </div>
));

export const IconOnly = createPreview(() => (
  <div className="flex items-center gap-4">
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="active" />
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="action" />
  </div>
));

export const WithIcon = createPreview(() => (
  <Button variant="outline">
    <Plus className="mr-1 size-3.5" />
    Add another destination
  </Button>
));

export const Disabled = createPreview(() => (
  <div className="flex items-center gap-4">
    <Button variant="primary" disabled>
      Saving...
    </Button>
    <Button label="Disabled trigger" disabled />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    children: { type: 'text', default: 'Save alert' },
    variant: {
      type: 'select',
      options: [
        'default',
        'active',
        'action',
        'muted-action',
        'primary',
        'outline',
        'ghost',
        'destructive',
      ],
      default: 'primary',
    },
    size: { type: 'radio', options: ['default', 'sm'], default: 'default' },
    disabled: { type: 'boolean', default: false },
  }),
  render: v => (
    <Button variant={v.variant} size={v.size} disabled={v.disabled}>
      {v.children}
    </Button>
  ),
});
