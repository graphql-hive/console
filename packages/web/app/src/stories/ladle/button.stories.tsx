import type { Story } from "@ladle/react";
import { Button } from "@/components/ui/button";
import { ArrowDown, Download, Trash2 } from "lucide-react";

export const Default: Story = () => <Button>Default Button</Button>;

export const Primary: Story = () => (
  <Button variant="primary">Primary Button</Button>
);

export const Destructive: Story = () => (
  <Button variant="destructive">Destructive</Button>
);

export const Outline: Story = () => <Button variant="outline">Outline</Button>;

export const Secondary: Story = () => (
  <Button variant="secondary">Secondary</Button>
);

export const Ghost: Story = () => <Button variant="ghost">Ghost</Button>;

export const Link: Story = () => <Button variant="link">Link Button</Button>;

export const OrangeLink: Story = () => (
  <Button variant="orangeLink">Orange Link</Button>
);

export const AllVariants: Story = () => (
  <div className="flex flex-wrap gap-4">
    <Button variant="default">Default</Button>
    <Button variant="primary">Primary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
    <Button variant="orangeLink">Orange Link</Button>
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
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Button Color Variants
      </h2>
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
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Hover States</h2>
      <p className="text-neutral-11 text-sm mb-4">
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
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Neutral Scale Reference
      </h2>
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
          <div key={level} className="text-center">
            <div
              className={`h-12 rounded mb-1 bg-neutral-${level} border border-neutral-6`}
            />
            <span className="text-xs text-neutral-11">{level}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
