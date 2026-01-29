import { useState } from 'react';
import { Input } from '@/components/v2/input';
import type { Story } from '@ladle/react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export default {
  title: 'V2 / Input',
};

export const Default: Story = () => <Input placeholder="Enter text..." />;

export const Sizes: Story = () => (
  <div className="space-y-4">
    <Input size="large" placeholder="Large input" />
    <Input size="medium" placeholder="Medium input" />
    <Input size="small" placeholder="Small input" />
  </div>
);

export const WithPrefix: Story = () => (
  <Input
    placeholder="Search..."
    prefix={<MagnifyingGlassIcon className="text-neutral-10" width={16} height={16} />}
  />
);

export const WithSuffix: Story = () => (
  <Input placeholder="Enter amount" suffix={<span className="text-neutral-10 text-sm">USD</span>} />
);

export const WithClearButton: Story = () => {
  const [value, setValue] = useState('Some text');
  return (
    <Input
      value={value}
      onChange={e => setValue(e.target.value)}
      onClear={() => setValue('')}
      placeholder="Type something..."
    />
  );
};

export const Invalid: Story = () => (
  <div className="space-y-4">
    <Input isInvalid placeholder="Invalid input" value="invalid@" />
    <div className="text-xs text-red-500">Please enter a valid email address</div>
  </div>
);

export const Disabled: Story = () => (
  <Input disabled placeholder="Disabled input" value="Cannot edit this" />
);

export const SearchInput: Story = () => {
  const [value, setValue] = useState('');
  return (
    <Input
      value={value}
      onChange={e => setValue(e.target.value)}
      onClear={() => setValue('')}
      placeholder="Search projects..."
      prefix={<MagnifyingGlassIcon className="text-neutral-10" width={16} height={16} />}
    />
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Input Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Custom input component with prefix/suffix support, size variants, and optional clear button.
        Uses forwardRef for compatibility with form libraries.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input placeholder="example" className="w-64" />
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Input container background</span>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="transparent" className="w-64" />
          <code className="text-xs">bg-transparent</code>
          <span className="text-neutral-11 text-xs">- Actual input element</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input placeholder="border" className="w-64" />
          <code className="text-xs">border-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Default border</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input placeholder="normal" value="Normal text" className="w-64" />
          <code className="text-xs">text-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Default text color</span>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="placeholder" className="w-64" />
          <code className="text-xs">placeholder:text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Placeholder color</span>
        </div>
        <div className="flex items-center gap-3">
          <Input isInvalid placeholder="invalid" value="Error" className="w-64" />
          <code className="text-xs">text-red-500 caret-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Invalid state</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input placeholder="focus me" className="w-64" />
          <code className="text-xs">focus-within:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring on container</span>
        </div>
        <div className="flex items-center gap-3">
          <Input isInvalid placeholder="error ring" className="w-64" />
          <code className="text-xs">ring-red-500</code>
          <span className="text-neutral-11 text-xs">- Invalid focus ring</span>
        </div>
        <div className="flex items-center gap-3">
          <Input disabled placeholder="disabled" className="w-64" />
          <code className="text-xs">disabled:cursor-not-allowed</code>
          <span className="text-neutral-11 text-xs">- Disabled cursor</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size Variants</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input size="large" placeholder="large" className="w-64" />
          <code className="text-xs">h-[50px] px-4 py-[18px]</code>
          <span className="text-neutral-11 text-xs">- Large (default)</span>
        </div>
        <div className="flex items-center gap-3">
          <Input size="medium" placeholder="medium" className="w-64" />
          <code className="text-xs">px-4 py-2.5</code>
          <span className="text-neutral-11 text-xs">- Medium</span>
        </div>
        <div className="flex items-center gap-3">
          <Input size="small" placeholder="small" className="w-64" />
          <code className="text-xs">px-3 py-[5px]</code>
          <span className="text-neutral-11 text-xs">- Small</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Clear Button</h4>
      <div className="space-y-2">
        <div>
          <Input value="Text with clear" onClear={() => {}} className="w-64" />
          <p className="text-neutral-10 mt-2 text-xs">
            Clear button appears when both <code className="text-neutral-12">value</code> and{' '}
            <code className="text-neutral-12">onClear</code> are provided
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-neutral-2/50 rounded-sm p-0.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
            </svg>
          </button>
          <code className="text-xs">hover:bg-neutral-2/50</code>
          <span className="text-neutral-11 text-xs">- Clear button hover</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Features</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">flex items-center gap-4</code>
          <span className="text-neutral-11 text-xs">- Container layout for prefix/suffix</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">w-full</code>
          <span className="text-neutral-11 text-xs">- Input takes full width</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">onClear && pr-1</code>
          <span className="text-neutral-11 text-xs">- Adjusted padding with clear button</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses forwardRef for compatibility with React Hook Form and other libraries</li>
        <li>Container div wraps the actual input element</li>
        <li>Prefix and suffix can be any ReactElement (icons, text, etc.)</li>
        <li>Clear button only shows when both value and onClear are provided</li>
        <li>isInvalid prop changes text color and ring color to red</li>
        <li>Supports all standard HTML input props</li>
        <li>fontWeight inherited from container to input via style prop</li>
      </ul>
    </div>
  </div>
);
