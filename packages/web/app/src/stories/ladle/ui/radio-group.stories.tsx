import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Radio Group',
};

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
      <p className="text-neutral-11 text-sm">
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
        <p className="text-neutral-11 text-sm">
          Perfect for small teams. Includes 10 projects and basic features.
        </p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <RadioGroupItem value="pro" id="plan-pro" className="mt-1" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-pro">Pro Plan</Label>
        <p className="text-neutral-11 text-sm">
          For growing teams. Unlimited projects and advanced analytics.
        </p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <RadioGroupItem value="enterprise" id="plan-enterprise" className="mt-1" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-enterprise">Enterprise Plan</Label>
        <p className="text-neutral-11 text-sm">
          Custom solutions for large organizations with dedicated support.
        </p>
      </div>
    </div>
  </RadioGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Radio Group States</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Unselected</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <RadioGroup>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-1" />
                <Label htmlFor="showcase-1">Unselected option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-neutral-10 text-xs">
            Border: <code className="text-neutral-12">border-neutral-11</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Selected</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-2" />
                <Label htmlFor="showcase-2">Selected option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-neutral-10 text-xs">
            Border: <code className="text-neutral-12">border-neutral-11</code>
            <br />
            Indicator: <code className="text-neutral-12">text-neutral-11 fill-current</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Unselected</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <RadioGroup>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-3" disabled />
                <Label htmlFor="showcase-3">Disabled option</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-neutral-10 text-xs">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Selected</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="showcase-4" disabled />
                <Label htmlFor="showcase-4">Disabled selected</Label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-neutral-10 text-xs">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Focus States</h2>
      <p className="text-neutral-11 mb-4 text-sm">
        Tab to focus on a radio button to see the focus ring
      </p>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
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
      <p className="text-neutral-10 mt-2 text-xs">
        Focus ring: <code className="text-neutral-12">ring-ring</code> with{' '}
        <code className="text-neutral-12">ring-offset-neutral-2</code>
      </p>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Layout Variants</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical (Default)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
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
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
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
