import { useState } from 'react';
import { RadixSelect, SelectOption } from '@/components/v2/radix-select';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Radix Select',
};

const options: SelectOption[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
];

export const Default: Story = () => {
  const [value, setValue] = useState('');
  return (
    <RadixSelect
      value={value}
      onChange={setValue}
      options={options}
      placeholder="Select an option"
    />
  );
};

export const WithDefaultValue: Story = () => {
  const [value, setValue] = useState('2');
  return <RadixSelect value={value} onChange={setValue} options={options} />;
};

export const Disabled: Story = () => (
  <RadixSelect
    value=""
    onChange={() => {}}
    options={options}
    placeholder="Disabled select"
    isDisabled
  />
);

export const ManyOptions: Story = () => {
  const [value, setValue] = useState('');
  const manyOptions: SelectOption[] = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `Option ${i + 1}`,
  }));

  return (
    <RadixSelect
      value={value}
      onChange={setValue}
      options={manyOptions}
      placeholder="Choose from many"
    />
  );
};

export const WithDisabledOptions: Story = () => {
  const [value, setValue] = useState('');
  const optionsWithDisabled: SelectOption[] = [
    { value: '1', label: 'Available Option 1' },
    { value: '2', label: 'Disabled Option', disabled: true },
    { value: '3', label: 'Available Option 2' },
  ];

  return (
    <RadixSelect
      value={value}
      onChange={setValue}
      options={optionsWithDisabled}
      placeholder="Some options disabled"
    />
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Radix Select Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Select wrapper with custom styling. Uses RadixButton as trigger and provides
        dropdown with scroll buttons, checkmark indicators, and keyboard navigation.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-12 h-8 w-32 rounded-lg" />
          <code className="text-xs">bg-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Dropdown content background</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-neutral-2 text-sm">Item text</span>
          <code className="text-xs">text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Item text color</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-2 text-sm">Scroll buttons</span>
          <code className="text-xs">text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Chevron icons</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">focus:bg-neutral-11</code>
          <span className="text-neutral-11 text-xs">- Item focus background</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">data-disabled:opacity-50</code>
          <span className="text-neutral-11 text-xs">- Disabled item opacity</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">z-50 rounded-lg shadow-lg p-2</code>
          <span className="text-neutral-11 text-xs">- Content container</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-8 py-2</code>
          <span className="text-neutral-11 text-xs">- Item padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">ml-2</code>
          <span className="text-neutral-11 text-xs">- Trigger icon spacing</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Icon Indicator</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">absolute left-2</code>
          <span className="text-neutral-11 text-xs">- CheckIcon position when selected</span>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">ItemIndicator shows CheckIcon for selected item</p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Scroll Buttons</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Automatic scroll buttons:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>ScrollUpButton with ChevronUpIcon at top</li>
            <li>ScrollDownButton with ChevronDownIcon at bottom</li>
            <li>Show/hide automatically based on scroll position</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Position Prop</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Controls dropdown positioning:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Passed to Radix Select Content</li>
            <li>Options: "popper" or "item-aligned"</li>
            <li>Affects how dropdown positions relative to trigger</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Select primitives (Root, Trigger, Value, Icon, Content, etc.)</li>
        <li>RadixButton component used as trigger with asChild</li>
        <li>ChevronDownIcon hidden when disabled</li>
        <li>TypeScript generic &lt;T extends string&gt; for type-safe values</li>
        <li>SelectOption type defines {'{value, label, disabled?}'}</li>
        <li>Supports all Radix Select props (value, defaultValue, onValueChange, etc.)</li>
        <li>Cursor pointer and select-none on items</li>
        <li>Focus outline removed (focus:outline-none)</li>
      </ul>
    </div>
  </div>
);
