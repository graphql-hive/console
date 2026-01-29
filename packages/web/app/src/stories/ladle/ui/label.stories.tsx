import type { Story } from '@ladle/react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const Default: Story = () => <Label>Label Text</Label>;

export const WithInput: Story = () => (
  <div className="flex flex-col gap-2 max-w-md">
    <Label htmlFor="email">Email address</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
  </div>
);

export const WithCheckbox: Story = () => (
  <div className="flex items-center gap-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
  </div>
);

export const WithRadioGroup: Story = () => (
  <div className="space-y-3">
    <Label>Select an option</Label>
    <RadioGroup defaultValue="option1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option1" id="opt1" />
        <Label htmlFor="opt1">Option 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option2" id="opt2" />
        <Label htmlFor="opt2">Option 2</Label>
      </div>
    </RadioGroup>
  </div>
);

export const Required: Story = () => (
  <div className="flex flex-col gap-2 max-w-md">
    <Label htmlFor="required">
      Name <span className="text-red-500">*</span>
    </Label>
    <Input id="required" placeholder="Enter your name" />
  </div>
);

export const WithHelpText: Story = () => (
  <div className="flex flex-col gap-2 max-w-md">
    <Label htmlFor="username">Username</Label>
    <Input id="username" placeholder="johndoe" />
    <p className="text-xs text-neutral-11">
      This will be your public display name
    </p>
  </div>
);

export const DisabledPeer: Story = () => (
  <div className="space-y-4 max-w-md">
    <div className="flex flex-col gap-2">
      <Label htmlFor="disabled-input" className="peer">
        Disabled Input
      </Label>
      <Input id="disabled-input" disabled placeholder="Disabled" />
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="disabled-checkbox" disabled />
      <Label htmlFor="disabled-checkbox" className="peer">
        Disabled Checkbox
      </Label>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Label Variants</h2>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Label</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Label>Default Label Text</Label>
          </div>
          <p className="text-xs text-neutral-10">
            Font: <code className="text-neutral-12">text-sm font-medium</code>
            <br />
            Color: <code className="text-neutral-12">text-neutral-12 (inherited)</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Input</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="showcase-input">Email address</Label>
              <Input id="showcase-input" type="email" placeholder="you@example.com" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Required Indicator</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Label>
              Required Field <span className="text-red-500">*</span>
            </Label>
          </div>
          <p className="text-xs text-neutral-10">
            Asterisk: <code className="text-neutral-12">text-red-500</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Peer Disabled State</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="enabled" />
              <Label htmlFor="enabled">Enabled Checkbox</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="disabled-peer" disabled />
              <Label htmlFor="disabled-peer">Disabled Checkbox</Label>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Disabled peer: <code className="text-neutral-12">peer-disabled:opacity-70</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Examples</h2>
      <div className="space-y-6 p-4 bg-neutral-1 rounded border border-neutral-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="example1">Text Input</Label>
          <Input id="example1" placeholder="Enter text..." />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="example2" />
          <Label htmlFor="example2">Checkbox with label</Label>
        </div>

        <div className="space-y-2">
          <Label>Radio Group</Label>
          <RadioGroup defaultValue="a">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="example-a" />
              <Label htmlFor="example-a">Option A</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="example-b" />
              <Label htmlFor="example-b">Option B</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="example3">
            Field with help text <span className="text-neutral-11 font-normal">(optional)</span>
          </Label>
          <Input id="example3" placeholder="Optional field" />
          <p className="text-xs text-neutral-11">
            This field is optional and has additional context
          </p>
        </div>
      </div>
    </div>
  </div>
);
