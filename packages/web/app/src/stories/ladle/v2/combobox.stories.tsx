import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Combobox',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Combobox Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Multi-select component using react-select with optional creatable functionality. Allows
        selecting multiple values and optionally creating new options on the fly.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>react-select - Core multi-select functionality</li>
        <li>react-select/creatable (CreatableSelect) - Create new options</li>
        <li>@radix-ui/react-icons - CaretDownIcon, CrossCircledIcon</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Multi-select support (value is array of Options)</li>
        <li>Optional creatable mode via creatable prop</li>
        <li>Custom ClearIndicator using CrossCircledIcon</li>
        <li>Custom DropdownIndicator using CaretDownIcon</li>
        <li>Custom NoOptionsMessage with different text for creatable mode</li>
        <li>Disabled and loading states</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props Interface</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  name: string;
  placeholder: string;
  options: readonly Option[];
  value?: readonly Option[];
  onChange: (value: readonly Option[]) => void;
  onBlur: (el: unknown) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  creatable?: boolean; // Enables creating new options
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Custom Components</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Overrides default react-select components:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              <strong className="text-neutral-12">ClearIndicator:</strong> CrossCircledIcon instead
              of default
            </li>
            <li>
              <strong className="text-neutral-12">DropdownIndicator:</strong> CaretDownIcon instead
              of default
            </li>
            <li>
              <strong className="text-neutral-12">NoOptionsMessage:</strong> Shows "Start typing to
              add values" (creatable) or "No options"
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Creatable Mode</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-10 text-xs">
            When creatable=true, uses CreatableSelect instead of Select. Users can type new values
            that aren't in the options list and they'll be added to the selection.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Styling</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Custom styling via classNames prop:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>control: Border, background, and state colors</li>
            <li>menu: Dark background (bg-neutral-1), border, shadow</li>
            <li>option: Hover and selected states (bg-neutral-3, bg-neutral-5)</li>
            <li>multiValue: Tag styling for selected items (bg-neutral-5, text-neutral-12)</li>
            <li>multiValueRemove: Hover state for remove button</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { Combobox } from '@/components/v2/combobox';

const options = [
  { value: 'tag1', label: 'Tag 1' },
  { value: 'tag2', label: 'Tag 2' },
];

<Combobox
  name="tags"
  placeholder="Select tags..."
  options={options}
  value={selectedTags}
  onChange={setSelectedTags}
  onBlur={() => {}}
  creatable // Allow creating new tags
/>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Conditionally uses CreatableSelect or Select based on creatable prop</li>
        <li>isMulti, isSearchable, isClearable all set to true</li>
        <li>Custom classNames object for consistent theming</li>
        <li>Spread props for flexibility</li>
        <li>NoOptionsMessage adapts text based on creatable mode</li>
        <li>Icon size and styling integrated with Radix icons</li>
      </ul>
    </div>
  </div>
);
