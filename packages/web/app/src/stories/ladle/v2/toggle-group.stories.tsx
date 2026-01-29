import type { Story } from '@ladle/react';
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/v2/toggle-group';
import { FontBoldIcon, FontItalicIcon, UnderlineIcon } from '@radix-ui/react-icons';

export default {
  title: 'V2 / Toggle Group',
};

export const Single: Story = () => {
  const [value, setValue] = useState('center');
  return (
    <ToggleGroup type="single" value={value} onValueChange={setValue}>
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  );
};

export const Multiple: Story = () => {
  const [value, setValue] = useState(['bold']);
  return (
    <ToggleGroup type="multiple" value={value} onValueChange={setValue}>
      <ToggleGroupItem value="bold">
        <FontBoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic">
        <FontItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export const TextFormatting: Story = () => {
  const [formatting, setFormatting] = useState<string[]>([]);
  return (
    <div className="space-y-4">
      <ToggleGroup type="multiple" value={formatting} onValueChange={setFormatting}>
        <ToggleGroupItem value="bold" className="w-10">
          <FontBoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" className="w-10">
          <FontItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" className="w-10">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="text-neutral-11 text-xs">
        Selected: {formatting.length > 0 ? formatting.join(', ') : 'none'}
      </div>
    </div>
  );
};

export const ViewModes: Story = () => {
  const [view, setView] = useState('grid');
  return (
    <div className="space-y-4">
      <ToggleGroup type="single" value={view} onValueChange={setView}>
        <ToggleGroupItem value="list" className="px-4">
          List
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" className="px-4">
          Grid
        </ToggleGroupItem>
        <ToggleGroupItem value="table" className="px-4">
          Table
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="text-neutral-11 text-xs">Current view: {view}</div>
    </div>
  );
};

export const Disabled: Story = () => (
  <ToggleGroup type="single" value="center" disabled>
    <ToggleGroupItem value="left">Left</ToggleGroupItem>
    <ToggleGroupItem value="center">Center</ToggleGroupItem>
    <ToggleGroupItem value="right">Right</ToggleGroupItem>
  </ToggleGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Toggle Group Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Toggle Group wrapper for single or multiple selection. Items appear as connected
        buttons with rounded ends. Useful for toolbars and view switchers.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value="demo">
            <ToggleGroupItem value="demo">Item</ToggleGroupItem>
          </ToggleGroup>
          <code className="text-xs">inline-flex rounded-md shadow-sm</code>
          <span className="text-neutral-11 text-xs">- Root container</span>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value="a">
            <ToggleGroupItem value="a">First</ToggleGroupItem>
            <ToggleGroupItem value="b">Last</ToggleGroupItem>
          </ToggleGroup>
          <code className="text-xs">first:rounded-l-md last:rounded-r-md</code>
          <span className="text-neutral-11 text-xs">- Item border radius</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Item Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">flex items-center justify-center p-2</code>
          <span className="text-neutral-11 text-xs">- Item flexbox and padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">first:ml-0</code>
          <span className="text-neutral-11 text-xs">- First item margin</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States (Commented)</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            The component includes commented-out style examples:
          </p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">hover</code> - Background color change on hover
            </li>
            <li>
              <code className="text-neutral-12">data-[state=on]</code> - Active/selected state
              styling
            </li>
            <li>
              <code className="text-neutral-12">focus</code> - Focus ring with box-shadow
            </li>
          </ul>
          <p className="text-neutral-10 mt-2 text-xs">
            These can be added via className prop as needed
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Type Modes</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Single selection:</p>
          <ToggleGroup type="single" defaultValue="b">
            <ToggleGroupItem value="a" className="px-4">
              A
            </ToggleGroupItem>
            <ToggleGroupItem value="b" className="px-4">
              B
            </ToggleGroupItem>
            <ToggleGroupItem value="c" className="px-4">
              C
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-neutral-10 mt-1 text-xs">Only one item can be selected</p>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Multiple selection:</p>
          <ToggleGroup type="multiple" defaultValue={['1', '3']}>
            <ToggleGroupItem value="1" className="px-4">
              1
            </ToggleGroupItem>
            <ToggleGroupItem value="2" className="px-4">
              2
            </ToggleGroupItem>
            <ToggleGroupItem value="3" className="px-4">
              3
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-neutral-10 mt-1 text-xs">Multiple items can be selected</p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Text formatting toolbar:</p>
          <ToggleGroup type="multiple" defaultValue={['bold']}>
            <ToggleGroupItem value="bold" className="w-9">
              <FontBoldIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" className="w-9">
              <FontItalicIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" className="w-9">
              <UnderlineIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">View switcher:</p>
          <ToggleGroup type="single" defaultValue="list">
            <ToggleGroupItem value="list" className="px-3 text-xs">
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" className="px-3 text-xs">
              Grid
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Toggle Group primitives (Root, Item)</li>
        <li>ToggleGroup is the container, ToggleGroupItem is individual toggle</li>
        <li>Type prop: "single" for radio-like behavior, "multiple" for checkbox-like</li>
        <li>Value is string for single, string[] for multiple</li>
        <li>First and last items get rounded corners automatically</li>
        <li>Shadow-sm applied to group for subtle elevation</li>
        <li>Custom className supported on both container and items</li>
        <li>Supports disabled prop on entire group or individual items</li>
      </ul>
    </div>
  </div>
);
