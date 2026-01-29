import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Select } from '@/components/v2/select';

export default {
  title: 'V2 / Select',
};

const options = [
  { name: 'Option 1', value: '1' },
  { name: 'Option 2', value: '2' },
  { name: 'Option 3', value: '3' },
];

export const Default: Story = () => {
  const [value, setValue] = useState('');
  return (
    <Select
      value={value}
      onChange={e => setValue(e.target.value)}
      options={options}
      placeholder="Select an option"
    />
  );
};

export const WithValue: Story = () => {
  const [value, setValue] = useState('2');
  return <Select value={value} onChange={e => setValue(e.target.value)} options={options} />;
};

export const Invalid: Story = () => {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-2">
      <Select
        value={value}
        onChange={e => setValue(e.target.value)}
        options={options}
        placeholder="Select required field"
        isInvalid
      />
      <div className="text-xs text-red-500">This field is required</div>
    </div>
  );
};

export const ManyOptions: Story = () => {
  const [value, setValue] = useState('');
  const manyOptions = Array.from({ length: 20 }, (_, i) => ({
    name: `Option ${i + 1}`,
    value: String(i + 1),
  }));

  return (
    <Select
      value={value}
      onChange={e => setValue(e.target.value)}
      options={manyOptions}
      placeholder="Choose from many options"
    />
  );
};

export const FormExample: Story = () => {
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');

  const countries = [
    { name: 'United States', value: 'us' },
    { name: 'United Kingdom', value: 'uk' },
    { name: 'Canada', value: 'ca' },
    { name: 'Germany', value: 'de' },
  ];

  const languages = [
    { name: 'English', value: 'en' },
    { name: 'Spanish', value: 'es' },
    { name: 'French', value: 'fr' },
    { name: 'German', value: 'de' },
  ];

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Country</label>
        <Select
          value={country}
          onChange={e => setCountry(e.target.value)}
          options={countries}
          placeholder="Select country"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Language</label>
        <Select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          options={languages}
          placeholder="Select language"
        />
      </div>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Select Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Styled native select element with custom arrow icon. Accepts options array or manual option
        children. Includes invalid state styling.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Select options={options} value="1" className="w-64" />
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Default background</span>
        </div>
        <div className="flex items-center gap-3">
          <Select options={options} value="1" className="w-64" />
          <code className="text-xs">active:bg-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Active/clicking state</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Select options={options} value="" placeholder="Normal" className="w-64" />
          <code className="text-xs">border-transparent</code>
          <span className="text-neutral-11 text-xs">- Default border</span>
        </div>
        <div className="flex items-center gap-3">
          <Select options={options} value="" placeholder="Invalid" isInvalid className="w-64" />
          <code className="text-xs">border-red-500</code>
          <span className="text-neutral-11 text-xs">- Invalid state border</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Select options={options} value="1" className="w-64" />
          <code className="text-xs">text-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Selected value</span>
        </div>
        <div className="flex items-center gap-3">
          <Select options={options} value="" placeholder="Placeholder" className="w-64" />
          <code className="text-xs">text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Placeholder/no selection</span>
        </div>
        <div className="flex items-center gap-3">
          <Select options={options} value="" placeholder="Error" isInvalid className="w-64" />
          <code className="text-xs">text-red-500</code>
          <span className="text-neutral-11 text-xs">- Invalid state</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Icon</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Select options={options} value="" placeholder="Arrow" className="w-64" />
          <code className="text-xs">ArrowDownIcon text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Dropdown arrow (absolute positioned)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">right-4 translate-y-1/2</code>
          <span className="text-neutral-11 text-xs">- Arrow positioning</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Select options={options} value="1" className="w-64" />
          <code className="text-xs">focus:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">transition</code>
          <span className="text-neutral-11 text-xs">- Smooth state transitions</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Size and Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">h-[50px]</code>
          <span className="text-neutral-11 text-xs">- Fixed height</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">w-full</code>
          <span className="text-neutral-11 text-xs">- Full width of container</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">pl-4 pr-10</code>
          <span className="text-neutral-11 text-xs">- Padding (extra right for arrow)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-ellipsis</code>
          <span className="text-neutral-11 text-xs">- Truncate long text</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Options Handling</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Two ways to provide options:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              Via <code className="text-neutral-12">options</code> prop array
            </li>
            <li>As children (manual option elements)</li>
            <li>Placeholder creates empty value option when provided</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Wrapper div provides relative positioning for arrow icon</li>
        <li>Native select element for accessibility and mobile support</li>
        <li>ArrowDownIcon positioned absolutely in top right</li>
        <li>isInvalid prop changes both border and text to red</li>
        <li>Text color changes based on value (selected vs placeholder)</li>
        <li>Supports all standard HTML select props via spread</li>
        <li>Custom className applies to wrapper div</li>
      </ul>
    </div>
  </div>
);
