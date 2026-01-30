import { RadixButton } from '@/components/v2/radix-button';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Radix Button',
};

export const Default: Story = () => <RadixButton>Click me</RadixButton>;

export const Multiple: Story = () => (
  <div className="flex gap-3">
    <RadixButton>Primary</RadixButton>
    <RadixButton>Secondary</RadixButton>
    <RadixButton>Tertiary</RadixButton>
  </div>
);

export const Disabled: Story = () => <RadixButton disabled>Disabled Button</RadixButton>;

export const WithIcon: Story = () => (
  <div className="flex gap-3">
    <RadixButton>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
      </svg>
      Add Item
    </RadixButton>
    <RadixButton>
      Save
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="ml-2">
        <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
      </svg>
    </RadixButton>
  </div>
);

export const CustomStyling: Story = () => (
  <div className="flex gap-3">
    <RadixButton className="text-neutral-12 bg-blue-600 hover:bg-blue-700">Blue Button</RadixButton>
    <RadixButton className="text-neutral-12 bg-green-600 hover:bg-green-700">
      Green Button
    </RadixButton>
    <RadixButton className="text-neutral-12 bg-red-600 hover:bg-red-700">Red Button</RadixButton>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Radix Button Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Simple button component with forwardRef support. Provides base button styling with white
        background and gray text. Designed to be extended with custom className.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <RadixButton>Example</RadixButton>
          <code className="text-xs">bg-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Default background</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <RadixButton>Example</RadixButton>
          <code className="text-xs">text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Default text color</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive States</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <RadixButton>Focus me</RadixButton>
          <code className="text-xs">focus-within:ring</code>
          <span className="text-neutral-11 text-xs">- Focus ring</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">inline-flex items-center justify-center</code>
          <span className="text-neutral-11 text-xs">- Flexbox layout</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-md px-4 py-2</code>
          <span className="text-neutral-11 text-xs">- Border radius and padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-sm font-medium</code>
          <span className="text-neutral-11 text-xs">- Typography</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">select-none</code>
          <span className="text-neutral-11 text-xs">- Prevent text selection</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Group Class</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">group</code>
          <span className="text-neutral-11 text-xs">
            - Enables group-based variants for child elements
          </span>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            Allows child elements to style based on parent state using group-hover:, group-focus:,
            etc.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Customization Examples</h4>
      <div className="space-y-3">
        <RadixButton className="bg-neutral-2 text-neutral-12">Accent Button</RadixButton>
        <RadixButton className="border-neutral-2 text-neutral-2 border-2 bg-transparent">
          Outlined
        </RadixButton>
        <RadixButton className="text-neutral-11 hover:bg-neutral-3 bg-transparent shadow-none">
          Ghost
        </RadixButton>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">With Icons</h4>
      <div className="space-y-2">
        <div className="flex gap-3">
          <RadixButton>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
              <circle cx="8" cy="8" r="6" />
            </svg>
            Icon Left
          </RadixButton>
          <RadixButton>
            Icon Right
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="ml-2">
              <circle cx="8" cy="8" r="6" />
            </svg>
          </RadixButton>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses forwardRef for ref forwarding to button element</li>
        <li>All standard button HTML props supported via spread</li>
        <li>Custom className merged with default styles using clsx()</li>
        <li>DisplayName set to "Button" for debugging</li>
        <li>Exported as RadixButton to distinguish from other button components</li>
        <li>Minimal styling - intended to be customized via className</li>
        <li>Group class enables Radix UI state-based styling patterns</li>
        <li>Focus-within instead of focus allows child element focus to trigger ring</li>
      </ul>
    </div>
  </div>
);
