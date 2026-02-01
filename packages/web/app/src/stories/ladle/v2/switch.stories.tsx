import { Switch } from '@/components/v2/switch';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Switch',
};

export const Default: Story = () => (
  <div className="flex items-center gap-2">
    <Switch id="default" />
    <label htmlFor="default" className="text-sm">
      Enable notifications
    </label>
  </div>
);

export const Checked: Story = () => (
  <div className="flex items-center gap-2">
    <Switch id="checked" defaultChecked />
    <label htmlFor="checked" className="text-sm">
      Enabled by default
    </label>
  </div>
);

export const Disabled: Story = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Switch id="disabled-off" disabled />
      <label htmlFor="disabled-off" className="text-neutral-10 text-sm">
        Disabled (off)
      </label>
    </div>
    <div className="flex items-center gap-2">
      <Switch id="disabled-on" disabled defaultChecked />
      <label htmlFor="disabled-on" className="text-neutral-10 text-sm">
        Disabled (on)
      </label>
    </div>
  </div>
);

export const Settings: Story = () => (
  <div className="border-neutral-6 bg-neutral-1 space-y-4 rounded-lg border p-4">
    <div className="mb-2 text-sm font-semibold">Preferences</div>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">Dark mode</div>
        <div className="text-neutral-10 text-xs">Use dark theme across the application</div>
      </div>
      <Switch id="dark-mode" defaultChecked />
    </div>
    <div className="border-neutral-6 border-t" />
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">Auto-save</div>
        <div className="text-neutral-10 text-xs">Automatically save changes</div>
      </div>
      <Switch id="auto-save" />
    </div>
    <div className="border-neutral-6 border-t" />
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">Analytics</div>
        <div className="text-neutral-10 text-xs">Help improve the product</div>
      </div>
      <Switch id="analytics" defaultChecked />
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Switch Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Switch wrapper with accent color theming. Toggle control for binary on/off states.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors (Root)</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Track background</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Thumb Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">bg-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Unchecked thumb</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <code className="text-xs">data-[state=checked]:bg-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Checked thumb</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors (Thumb)</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">border-transparent</code>
          <span className="text-neutral-11 text-xs">- Default border (2px)</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">hover:border-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Hover border (unchecked, not disabled)</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <code className="text-xs">hover:data-[state=checked]:border-orange-500</code>
          <span className="text-neutral-11 text-xs">- Hover border (checked)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">focus:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring on track</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch disabled />
          <code className="text-xs">disabled:cursor-not-allowed</code>
          <span className="text-neutral-11 text-xs">- Disabled cursor</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <code className="text-xs">data-[state=checked]:translate-x-5</code>
          <span className="text-neutral-11 text-xs">- Thumb translation when checked</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size and Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">h-[25px] w-[45px]</code>
          <span className="text-neutral-11 text-xs">- Track size</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">size-[25px]</code>
          <span className="text-neutral-11 text-xs">- Thumb size (25px circle)</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">rounded-full</code>
          <span className="text-neutral-11 text-xs">- Both track and thumb</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Animation</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch />
          <code className="text-xs">transition-all</code>
          <span className="text-neutral-11 text-xs">- Smooth thumb movement</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Switch primitives (Root, Thumb)</li>
        <li>Supports all Radix Switch props (checked, defaultChecked, onCheckedChange, etc.)</li>
        <li>Custom className merged with default styles using clsx()</li>
        <li>Conditional hover styles based on disabled prop</li>
        <li>Data attributes for checked state styling</li>
      </ul>
    </div>
  </div>
);
