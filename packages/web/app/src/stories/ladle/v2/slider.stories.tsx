import { useState } from 'react';
import { Slider } from '@/components/v2/slider';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Slider',
};

export const Default: Story = () => {
  const [value, setValue] = useState([50]);
  return (
    <div className="w-64">
      <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
      <div className="text-neutral-11 mt-2 text-xs">Value: {value[0]}</div>
    </div>
  );
};

export const Range: Story = () => {
  const [value, setValue] = useState([25, 75]);
  return (
    <div className="w-64">
      <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
      <div className="text-neutral-11 mt-2 text-xs">
        Range: {value[0]} - {value[1]}
      </div>
    </div>
  );
};

export const Steps: Story = () => {
  const [value, setValue] = useState([0]);
  return (
    <div className="w-64 space-y-4">
      <div>
        <div className="text-neutral-11 mb-2 text-xs">Step: 1</div>
        <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
      </div>
      <div>
        <div className="text-neutral-11 mb-2 text-xs">Step: 10</div>
        <Slider value={[50]} min={0} max={100} step={10} />
      </div>
      <div>
        <div className="text-neutral-11 mb-2 text-xs">Step: 25</div>
        <Slider value={[50]} min={0} max={100} step={25} />
      </div>
    </div>
  );
};

export const Disabled: Story = () => (
  <div className="w-64">
    <Slider value={[50]} disabled min={0} max={100} step={1} />
    <div className="text-neutral-10 mt-2 text-xs">Disabled slider</div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Slider Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Slider wrapper for selecting numeric values. Supports single value or range
        selection with customizable steps.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">bg-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Track and Range</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">bg-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Thumb (handle)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">focus-within:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring on thumb</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size and Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">h-5</code>
          <span className="text-neutral-11 text-xs">- Root height (20px for touch)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">h-1</code>
          <span className="text-neutral-11 text-xs">- Track height (4px)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Slider value={[50]} min={0} max={100} step={1} />
          </div>
          <code className="text-xs">size-5</code>
          <span className="text-neutral-11 text-xs">- Thumb size (20px circle)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-full</code>
          <span className="text-neutral-11 text-xs">- Track and thumb</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Touch Behavior</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">touch-none</code>
          <span className="text-neutral-11 text-xs">- Prevents browser touch scrolling</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-4">
        <div className="w-64">
          <div className="text-neutral-11 mb-2 text-sm">Volume control:</div>
          <Slider value={[75]} min={0} max={100} step={1} />
        </div>
        <div className="w-64">
          <div className="text-neutral-11 mb-2 text-sm">Price range:</div>
          <Slider value={[20, 80]} min={0} max={100} step={5} />
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Slider primitives (Root, Track, Range, Thumb)</li>
        <li>Supports single value or range (array of values)</li>
        <li>All Radix Slider props supported (min, max, step, value, onValueChange, etc.)</li>
        <li>aria-label set to "value" for accessibility</li>
        <li>Root has flex layout with items-center for vertical centering</li>
        <li>Track grows to fill available width</li>
        <li>Range shows selected portion of track</li>
      </ul>
    </div>
  </div>
);
