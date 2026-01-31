import { ArrowDown, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Button',
};

export const Default: Story = () => <Button>Default Button</Button>;

export const Primary: Story = () => <Button variant="primary">Primary Button</Button>;

export const Destructive: Story = () => <Button variant="destructive">Destructive</Button>;

export const Outline: Story = () => <Button variant="outline">Outline</Button>;

export const Secondary: Story = () => <Button variant="secondary">Secondary</Button>;

export const Ghost: Story = () => <Button variant="ghost">Ghost</Button>;

export const Link: Story = () => <Button variant="link">Link Button</Button>;

export const OrangeLink: Story = () => <Button variant="orangeLink">Orange Link</Button>;

export const AllVariants: Story = () => (
  <div className="flex flex-wrap gap-4">
    {/* <Button variant="default">Default</Button>
    <Button variant="primary">Primary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
    <Button variant="orangeLink">Orange Link</Button> */}
    <div className="bg-orange saturate-160 h-24 w-24"></div>
    <div className="bg-orange h-24 w-24 brightness-150"></div>
    <div className="bg-orange brightness-140 h-24 w-24"></div>
    <div className="bg-orange brightness-130 h-24 w-24"></div>
    <div className="bg-orange brightness-120 h-24 w-24"></div>
    <div className="bg-orange h-24 w-24 brightness-110"></div>
    <div className="bg-orange h-24 w-24"></div>
    <div className="bg-orange h-24 w-24 brightness-90"></div>
    <div className="bg-orange brightness-80 h-24 w-24"></div>
    <div className="bg-orange brightness-70 h-24 w-24"></div>
  </div>
);

export const AllSizes: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button size="icon">
      <ArrowDown size={20} />
    </Button>
    <Button size="icon-sm">
      <Download size={16} />
    </Button>
    <Button variant="primary">
      <Download size={16} className="mr-2" />
      Download
    </Button>
    <Button variant="destructive">
      <Trash2 size={16} className="mr-2" />
      Delete
    </Button>
  </div>
);

export const DisabledStates: Story = () => (
  <div className="flex flex-wrap gap-4">
    <Button disabled>Default Disabled</Button>
    <Button variant="primary" disabled>
      Primary Disabled
    </Button>
    <Button variant="destructive" disabled>
      Destructive Disabled
    </Button>
    <Button variant="outline" disabled>
      Outline Disabled
    </Button>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Button Color Variants</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default (Neutral)</p>
          <Button variant="default" className="w-full">
            Default Button
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Primary (Orange)</p>
          <Button variant="primary" className="w-full">
            Primary Button
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Destructive (Red)</p>
          <Button variant="destructive" className="w-full">
            Destructive
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Outline</p>
          <Button variant="outline" className="w-full">
            Outline
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Secondary</p>
          <Button variant="secondary" className="w-full">
            Secondary
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Ghost</p>
          <Button variant="ghost" className="w-full">
            Ghost
          </Button>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Hover States</h2>
      <p className="text-neutral-11 mb-4 text-sm">
        Hover over each button to see the hover state colors
      </p>
      <div className="flex flex-wrap gap-4">
        <Button variant="default">Hover Me</Button>
        <Button variant="primary">Hover Me</Button>
        <Button variant="destructive">Hover Me</Button>
        <Button variant="outline">Hover Me</Button>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Neutral Scale Reference</h2>
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(level => (
          <div key={level} className="text-center">
            <div className={`mb-1 h-12 rounded-sm bg-neutral-${level} border-neutral-6 border`} />
            <span className="text-neutral-11 text-xs">{level}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
