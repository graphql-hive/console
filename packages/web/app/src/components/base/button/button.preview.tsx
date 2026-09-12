import { ChevronDown, Copy, ListFilter, Plus, RefreshCw, X } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
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

/**
 * The two rungs of `controlSize`, one row each, across the three layouts. `default` (36px) is a
 * form control; `compact` (30px) is filter chrome. `icon-sm` (28px) is the square for a close or
 * clear icon inside something else and sits outside the ladder.
 */
export const Sizes = createPreview(() => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <span className="text-neutral-9 w-16 text-xs">default</span>
      <Button variant="primary">Save alert</Button>
      <Button label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
      <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />
    </div>
    <div className="flex items-center gap-4">
      <span className="text-neutral-9 w-16 text-xs">compact</span>
      <Button variant="primary" size="compact">
        Save alert
      </Button>
      <Button
        label="Last 7 days"
        size="compact"
        rightIcon={{ icon: ChevronDown, withSeparator: true }}
      />
      <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" size="compact" />
    </div>
    <div className="flex items-center gap-4">
      <span className="text-neutral-9 w-16 text-xs">icon-sm</span>
      <Button variant="ghost" size="icon-sm">
        <X className="size-4" />
      </Button>
    </div>
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

/**
 * `width="full"` is the modal-footer and auth-form shape: a pair of full-width buttons sharing a
 * row. It replaces the `className="w-full justify-center"` that 116 legacy call sites set by hand.
 */
export const FullWidth = createPreview(() => (
  <div className="flex w-96 flex-col gap-3">
    <Button variant="primary" width="full">
      Create organization
    </Button>
    <div className="flex gap-2">
      <Button variant="outline" width="full">
        Cancel
      </Button>
      <Button variant="primary" width="full">
        Save changes
      </Button>
    </div>
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Button, {
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
    size: { type: 'radio', options: ['default', 'compact'], default: 'default' },
    width: { type: 'radio', options: ['auto', 'full'], default: 'auto' },
    disabled: { type: 'boolean', default: false },
  }),
  render: v => (
    <div className="w-80">
      <Button variant={v.variant} size={v.size} width={v.width} disabled={v.disabled}>
        {v.children}
      </Button>
    </div>
  ),
});
