import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Autocomplete',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Autocomplete Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Advanced select component using react-select with virtualized list rendering via
        react-window. Includes search highlighting and custom dropdown indicator.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>react-select - Core select functionality</li>
        <li>react-window (FixedSizeList) - Virtualized list for performance with many options</li>
        <li>react-highlight-words (Highlighter) - Search term highlighting in options</li>
        <li>lucide-react (ChevronDown) - Dropdown indicator icon</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Virtualized rendering (40px item height) for efficient large lists</li>
        <li>Custom DropdownIndicator using ChevronDown icon</li>
        <li>No indicator separator (IndicatorSeparator returns null)</li>
        <li>Highlight matching search terms in options</li>
        <li>Custom filter function via createFilter</li>
        <li>Initial scroll to selected value</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Custom Styles</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">StylesConfig object customizes:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>input: color #fff (white text)</li>
            <li>control: various states (default, focused, disabled)</li>
            <li>option: background and text colors for different states</li>
            <li>menu: positioning and styling</li>
            <li>menuList: layout and spacing</li>
            <li>singleValue, placeholder, indicatorsContainer, etc.</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            Accepts all react-select SelectProps plus:
          </p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>options: SelectOption[] (from radix-select type)</li>
            <li>value, onChange, onBlur, etc.</li>
            <li>placeholder, isDisabled, isLoading</li>
            <li>Custom components (MenuList, DropdownIndicator, IndicatorSeparator)</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Performance</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-10 text-xs">
            Uses react-window FixedSizeList for virtualized rendering. Only visible options are
            rendered in the DOM, making it efficient for lists with hundreds or thousands of items.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { Autocomplete } from '@/components/v2/autocomplete';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  // ... many more options
];

<Autocomplete
  options={options}
  value={selectedOption}
  onChange={setSelectedOption}
  placeholder="Search..."
/>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Custom MenuList component wraps react-window FixedSizeList</li>
        <li>Item height fixed at 40px for consistent virtualization</li>
        <li>InitialScrollOffset positions list at selected value</li>
        <li>Highlighter shows matching text within options</li>
        <li>Extensive StylesConfig for dark theme integration</li>
        <li>Uses ComponentPropsWithRef for ref forwarding</li>
      </ul>
    </div>
  </div>
);
