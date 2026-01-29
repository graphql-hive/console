import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Story } from '@ladle/react';

export const Default: Story = () => <Checkbox />;

export const Checked: Story = () => <Checkbox defaultChecked />;

export const Disabled: Story = () => (
  <div className="flex gap-4">
    <Checkbox disabled />
    <Checkbox disabled checked />
  </div>
);

export const WithLabel: Story = () => (
  <div className="flex items-center gap-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
  </div>
);

export const MultipleWithLabels: Story = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2">
      <Checkbox id="option1" defaultChecked />
      <Label htmlFor="option1">Enable notifications</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="option2" />
      <Label htmlFor="option2">Enable email updates</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="option3" disabled />
      <Label htmlFor="option3">Disabled option</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="option4" disabled checked />
      <Label htmlFor="option4">Disabled checked option</Label>
    </div>
  </div>
);

export const Interactive: Story = () => {
  const [checked, setChecked] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="interactive"
          checked={checked}
          onCheckedChange={checked => setChecked(checked === true)}
        />
        <Label htmlFor="interactive">Interactive checkbox</Label>
      </div>
      <p className="text-neutral-11 text-sm">
        State: <span className="font-mono">{checked ? 'checked' : 'unchecked'}</span>
      </p>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Checkbox States</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Unchecked</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Checkbox />
          </div>
          <p className="text-neutral-10 text-xs">
            Border: <code className="text-neutral-12">border-neutral-11</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Checked</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Checkbox defaultChecked />
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-11</code>
            <br />
            Icon: <code className="text-neutral-12">text-neutral-2</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Unchecked</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Checkbox disabled />
          </div>
          <p className="text-neutral-10 text-xs">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled Checked</p>
          <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
            <Checkbox disabled checked />
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
        Tab to focus on the checkbox to see the focus ring
      </p>
      <div className="bg-neutral-1 border-neutral-6 rounded border p-4">
        <Checkbox />
      </div>
      <p className="text-neutral-10 mt-2 text-xs">
        Focus ring: <code className="text-neutral-12">ring-ring</code> with{' '}
        <code className="text-neutral-12">ring-offset-neutral-2</code>
      </p>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">With Labels</h2>
      <div className="bg-neutral-1 border-neutral-6 space-y-4 rounded border p-4">
        <div className="flex items-center gap-2">
          <Checkbox id="showcase1" defaultChecked />
          <Label htmlFor="showcase1">Checked option</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="showcase2" />
          <Label htmlFor="showcase2">Unchecked option</Label>
        </div>
      </div>
      <p className="text-neutral-10 mt-2 text-xs">
        Label color: <code className="text-neutral-12">text-neutral-12</code>
      </p>
    </div>
  </div>
);
