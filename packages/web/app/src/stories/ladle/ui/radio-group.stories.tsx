import React from 'react';
import type { Story } from '@ladle/react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export const Default: Story = () => (
  <RadioGroup defaultValue="option1">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option1" id="r1" />
      <Label htmlFor="r1">Option 1</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option2" id="r2" />
      <Label htmlFor="r2">Option 2</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option3" id="r3" />
      <Label htmlFor="r3">Option 3</Label>
    </div>
  </RadioGroup>
);

export const WithoutDefaultValue: Story = () => (
  <RadioGroup>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option1" id="r1-none" />
      <Label htmlFor="r1-none">Option 1</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option2" id="r2-none" />
      <Label htmlFor="r2-none">Option 2</Label>
    </div>
  </RadioGroup>
);

export const Disabled: Story = () => (
  <RadioGroup defaultValue="option1">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option1" id="r1-disabled" disabled />
      <Label htmlFor="r1-disabled">Disabled selected</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option2" id="r2-disabled" disabled />
      <Label htmlFor="r2-disabled">Disabled unselected</Label>
    </div>
  </RadioGroup>
);

export const Horizontal: Story = () => (
  <RadioGroup defaultValue="option1" className="flex gap-4">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option1" id="r1-horiz" />
      <Label htmlFor="r1-horiz">Yes</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option2" id="r2-horiz" />
      <Label htmlFor="r2-horiz">No</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="option3" id="r3-horiz" />
      <Label htmlFor="r3-horiz">Maybe</Label>
    </div>
  </RadioGroup>
);

export const Interactive: Story = () => {
  const [value, setValue] = React.useState('comfortable');

  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={setValue}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="default" id="r-default" />
          <Label htmlFor="r-default">Default</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="comfortable" id="r-comfortable" />
          <Label htmlFor="r-comfortable">Comfortable</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="compact" id="r-compact" />
          <Label htmlFor="r-compact">Compact</Label>
        </div>
      </RadioGroup>
      <p className="text-sm text-neutral-11">
        Selected: <span className="font-mono">{value}</span>
      </p>
    </div>
  );
};

export const WithDescriptions: Story = () => (
  <RadioGroup defaultValue="starter">
    <div className="flex items-start gap-3">
      <RadioGroupItem value="starter" id="plan-starter" className="mt-1" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-starter">Starter Plan</Label>
        <p className="text-sm text-neutral-11">
          Perfect for small teams. Includes 10 projects and basic features.
        </p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <RadioGroupItem value="pro" id="plan-pro" className="mt-1" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-pro">Pro Plan</Label>
        <p className="text-sm text-neutral-11">
          For growing teams. Unlimited projects and advanced analytics.
        </p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <RadioGroupItem value="enterprise" id="plan-enterprise" className="mt-1" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-enterprise">Enterprise Plan</Label>
        <p className="text-sm text-neutral-11">
          Custom solutions for large organizations with dedicated support.
        </p>
      </div>
    </div>
  </RadioGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Radio Group States</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Unselected</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-1" />
                <Label htmlFor="showcase-1">Unselected option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-primary</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Selected</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-2" />
                <Label htmlFor="showcase-2">Selected option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-primary</code>
            <br />
            Indicator: <code className="text-neutral-12">text-primary fill-current</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Unselected</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-3" disabled />
                <Label htmlFor="showcase-3">Disabled option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-xs text-neutral-10">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Selected</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-4" disabled />
                <Label htmlFor="showcase-4">Disabled selected</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-xs text-neutral-10">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Focus States</h2>
      <p className="text-neutral-11 text-sm mb-4">
        Tab to focus on a radio button to see the focus ring
      </p>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <RadioGroup defaultValue="option1">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="option1" id="focus-1" />
            <Label htmlFor="focus-1">Option 1</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="option2" id="focus-2" />
            <Label htmlFor="focus-2">Option 2</Label>
          </div>
        </RadioGroup>
      </div>
      <p className="text-xs text-neutral-10 mt-2">
        Focus ring: <code className="text-neutral-12">ring-ring</code> with{' '}
        <code className="text-neutral-12">ring-offset-neutral-2</code>
      </p>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Layout Variants</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical (Default)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="layout-1" />
                <Label htmlFor="layout-1">Option 1</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option2" id="layout-2" />
                <Label htmlFor="layout-2">Option 2</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Horizontal</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <RadioGroup defaultValue="option1" className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="layout-3" />
                <Label htmlFor="layout-3">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option2" id="layout-4" />
                <Label htmlFor="layout-4">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  </div>
);
