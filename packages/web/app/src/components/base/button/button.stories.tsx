import { ChevronDown, Copy, ListFilter, Plus, RefreshCw, X } from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Button } from './button';

export default {
  title: 'UI / Button',
} satisfies StoryDefault;

export const Actions: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button variant="primary">Save alert</Button>
    <Button variant="outline">
      <Plus className="mr-1 size-3.5" />
      Add another destination
    </Button>
    <Button variant="ghost" size="icon-sm">
      <X className="size-4" />
    </Button>
  </div>
);

export const Triggers: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button label="Last 7 days" rightIcon={{ icon: ChevronDown, withSeparator: true }} />
    <Button label="Filter" rightIcon={{ icon: ListFilter, withSeparator: true }} />
    <Button label="Filter" rightIcon={{ icon: ListFilter, withSeparator: false }} />
  </div>
);

export const TriggerVariants: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button label="Default" />
    <Button label="Active" variant="active" />
    <Button label="Save this filter view" variant="action" />
    <Button label="Muted action" variant="muted-action" />
  </div>
);

export const WithAccessory: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button
      label="Clients"
      accessoryInformation="3 clients"
      rightIcon={{ icon: X, withSeparator: true, action: () => {} }}
    />
  </div>
);

export const IconOnly: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" />
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="active" />
    <Button layout="iconOnly" icon={RefreshCw} aria-label="Refresh" variant="action" />
  </div>
);

export const CopyButton: Story = () => (
  <div className="p-8">
    <Button label="Copy JSON Schema" rightIcon={{ icon: Copy, withSeparator: true }} />
  </div>
);

export const Disabled: Story = () => (
  <div className="flex items-center gap-4 p-8">
    <Button variant="primary" disabled>
      Saving...
    </Button>
    <Button label="Disabled trigger" disabled />
  </div>
);
