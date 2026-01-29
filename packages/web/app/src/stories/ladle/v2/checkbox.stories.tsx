import type { Story } from '@ladle/react';
import { Checkbox } from '@/components/v2/checkbox';

export default {
  title: 'V2 / Checkbox',
};

export const Default: Story = () => (
  <div className="flex items-center gap-2">
    <Checkbox id="default" />
    <label htmlFor="default" className="text-sm">
      Accept terms and conditions
    </label>
  </div>
);

export const Checked: Story = () => (
  <div className="flex items-center gap-2">
    <Checkbox id="checked" defaultChecked />
    <label htmlFor="checked" className="text-sm">
      Checked by default
    </label>
  </div>
);

export const Disabled: Story = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Checkbox id="disabled-unchecked" disabled />
      <label htmlFor="disabled-unchecked" className="text-neutral-10 text-sm">
        Disabled unchecked
      </label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="disabled-checked" disabled defaultChecked />
      <label htmlFor="disabled-checked" className="text-neutral-10 text-sm">
        Disabled checked
      </label>
    </div>
  </div>
);

export const MultipleOptions: Story = () => (
  <div className="space-y-3">
    <div className="mb-4 text-sm font-medium">Select your preferences:</div>
    <div className="flex items-center gap-2">
      <Checkbox id="notifications" defaultChecked />
      <label htmlFor="notifications" className="text-sm">
        Email notifications
      </label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="updates" />
      <label htmlFor="updates" className="text-sm">
        Product updates
      </label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id="marketing" />
      <label htmlFor="marketing" className="text-sm">
        Marketing emails
      </label>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Checkbox Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Checkbox wrapper with accent color theming. Provides checked, unchecked, and
        disabled states with hover interactions.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Unchecked background</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox defaultChecked />
          <code className="text-xs">bg-current (accent color)</code>
          <span className="text-neutral-11 text-xs">- Checked background (Indicator)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">border-accent</code>
          <span className="text-neutral-11 text-xs">- Default border</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox disabled />
          <code className="text-xs">disabled:border-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Disabled border</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">text-accent</code>
          <span className="text-neutral-11 text-xs">- Root text color (unused in visual)</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox defaultChecked />
          <code className="text-xs">text-neutral-1</code>
          <span className="text-neutral-11 text-xs">- CheckIcon color</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">hover:border-orange-700</code>
          <span className="text-neutral-11 text-xs">- Hover state</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox disabled />
          <code className="text-xs">disabled:cursor-not-allowed</code>
          <span className="text-neutral-11 text-xs">- Disabled cursor</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size and Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">size-5</code>
          <span className="text-neutral-11 text-xs">- 20px × 20px</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">rounded-sm</code>
          <span className="text-neutral-11 text-xs">- Border radius</span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox />
          <code className="text-xs">shrink-0</code>
          <span className="text-neutral-11 text-xs">- Prevents shrinking in flex</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Checkbox primitives (Root, Indicator)</li>
        <li>CheckIcon from @radix-ui/react-icons</li>
        <li>Indicator background uses bg-current to inherit text color</li>
        <li>Supports all Radix Checkbox props (checked, defaultChecked, onCheckedChange, etc.)</li>
        <li>Custom className merged with default styles using cn() utility</li>
      </ul>
    </div>
  </div>
);
