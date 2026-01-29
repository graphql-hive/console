import { Badge, BadgeRounded } from '@/components/ui/badge';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Badge',
};

export const Default: Story = () => <Badge>Default Badge</Badge>;

export const Secondary: Story = () => <Badge variant="secondary">Secondary</Badge>;

export const Destructive: Story = () => <Badge variant="destructive">Destructive</Badge>;

export const Outline: Story = () => <Badge variant="outline">Outline</Badge>;

export const Success: Story = () => <Badge variant="success">Success</Badge>;

export const Warning: Story = () => <Badge variant="warning">Warning</Badge>;

export const Failure: Story = () => <Badge variant="failure">Failure</Badge>;

export const AllVariants: Story = () => (
  <div className="flex flex-wrap gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="success">Success</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="failure">Failure</Badge>
  </div>
);

export const RoundedBadges: Story = () => (
  <div className="flex items-center gap-3">
    <BadgeRounded color="red" />
    <BadgeRounded color="yellow" />
    <BadgeRounded color="green" />
    <BadgeRounded color="gray" />
    <BadgeRounded color="orange" />
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Badge Color Variants</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <Badge variant="default">Active</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Secondary</p>
          <Badge variant="secondary">Draft</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Destructive</p>
          <Badge variant="destructive">Error</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Outline</p>
          <Badge variant="outline">Pending</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Success (Emerald)</p>
          <Badge variant="success">Passed</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Warning (Yellow)</p>
          <Badge variant="warning">Unstable</Badge>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Failure (Red)</p>
          <Badge variant="failure">Failed</Badge>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Rounded Badge Colors</h2>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <BadgeRounded color="red" />
          <span className="text-neutral-11 text-sm">Red</span>
        </div>
        <div className="flex items-center gap-2">
          <BadgeRounded color="yellow" />
          <span className="text-neutral-11 text-sm">Yellow</span>
        </div>
        <div className="flex items-center gap-2">
          <BadgeRounded color="green" />
          <span className="text-neutral-11 text-sm">Green</span>
        </div>
        <div className="flex items-center gap-2">
          <BadgeRounded color="gray" />
          <span className="text-neutral-11 text-sm">Gray</span>
        </div>
        <div className="flex items-center gap-2">
          <BadgeRounded color="orange" />
          <span className="text-neutral-11 text-sm">Orange</span>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-neutral-11">Status:</span>
          <Badge variant="success">Deployed</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-11">Environment:</span>
          <Badge variant="warning">Staging</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-11">Version:</span>
          <Badge variant="outline">v2.1.0</Badge>
        </div>
      </div>
    </div>
  </div>
);
