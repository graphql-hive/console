import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Collapsible',
};

export const Default: Story = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between space-x-4">
        <h4 className="text-neutral-12 text-sm font-semibold">Can I use this in production?</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="text-neutral-11 border-neutral-6 rounded-md border px-4 py-3 text-sm">
          Yes! GraphQL Hive is production-ready and used by companies of all sizes.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const MultipleItems: Story = () => {
  const [open1, setOpen1] = React.useState(false);
  const [open2, setOpen2] = React.useState(false);
  const [open3, setOpen3] = React.useState(false);

  return (
    <div className="w-full max-w-md space-y-4">
      <Collapsible open={open1} onOpenChange={setOpen1}>
        <div className="flex items-center justify-between space-x-4">
          <h4 className="text-neutral-12 text-sm font-semibold">What is GraphQL Hive?</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className={`size-4 transition-transform ${open1 ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2">
          <p className="text-neutral-11 text-sm">
            GraphQL Hive is a schema registry, analytics platform, and gateway for GraphQL APIs.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={open2} onOpenChange={setOpen2}>
        <div className="flex items-center justify-between space-x-4">
          <h4 className="text-neutral-12 text-sm font-semibold">Is it open source?</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className={`size-4 transition-transform ${open2 ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2">
          <p className="text-neutral-11 text-sm">
            Yes, GraphQL Hive is fully open source under the MIT license.
          </p>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={open3} onOpenChange={setOpen3}>
        <div className="flex items-center justify-between space-x-4">
          <h4 className="text-neutral-12 text-sm font-semibold">Can I self-host it?</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className={`size-4 transition-transform ${open3 ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2">
          <p className="text-neutral-11 text-sm">
            Yes, you can self-host GraphQL Hive for complete control over your data.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const DefaultOpen: Story = () => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between space-x-4">
        <h4 className="text-neutral-12 text-sm font-semibold">Getting Started</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="text-neutral-11 space-y-2 text-sm">
          <p>1. Install the CLI</p>
          <p>2. Create an account</p>
          <p>3. Push your schema</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ColorPaletteShowcase: Story = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Collapsible Component</h2>
        <p className="text-neutral-11 mb-4">
          Interactive component for showing and hiding content. Built with Radix UI Collapsible.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Basic Collapsible</p>
            <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
              <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-neutral-12 text-sm font-semibold">Click to expand</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown
                        className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <p className="text-neutral-11 text-sm">
                    This content is hidden until you click the trigger button.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <p className="text-neutral-10 text-xs">
              No default styling - compose with your own components
              <br />
              Use ChevronDown icon with rotate-180 for visual feedback
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-11 space-y-1 text-sm">
            <li>
              <code className="text-neutral-12">Collapsible</code>: Root container (manages open
              state)
            </li>
            <li>
              <code className="text-neutral-12">CollapsibleTrigger</code>: Button that toggles
              visibility
            </li>
            <li>
              <code className="text-neutral-12">CollapsibleContent</code>: Content that shows/hides
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm">Collapsible (Root):</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">open</code>: Controlled open state (boolean)
            </li>
            <li>
              <code className="text-neutral-12">onOpenChange</code>: Callback when state changes
            </li>
            <li>
              <code className="text-neutral-12">defaultOpen</code>: Uncontrolled default state
            </li>
            <li>
              <code className="text-neutral-12">disabled</code>: Disable interaction
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Comparison with Accordion</h2>
        <div className="space-y-4">
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 mb-2 text-sm font-medium">Collapsible</p>
            <ul className="text-neutral-10 space-y-1 text-xs">
              <li>Single collapsible section</li>
              <li>No built-in styling</li>
              <li>Full control over layout and appearance</li>
              <li>Best for individual expand/collapse sections</li>
            </ul>
          </div>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 mb-2 text-sm font-medium">Accordion</p>
            <ul className="text-neutral-10 space-y-1 text-xs">
              <li>Multiple related sections</li>
              <li>Includes styling and borders</li>
              <li>Manages "only one open" or "multiple open" logic</li>
              <li>Best for FAQ lists or grouped content</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
        <div className="space-y-4">
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 mb-2 text-sm font-medium">Show/Hide Details</p>
            <p className="text-neutral-10 text-xs">
              Expand to show additional information, settings, or options.
            </p>
          </div>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 mb-2 text-sm font-medium">Advanced Options</p>
            <p className="text-neutral-10 text-xs">
              Hide advanced settings by default, show on demand.
            </p>
          </div>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 mb-2 text-sm font-medium">Sidebar Sections</p>
            <p className="text-neutral-10 text-xs">
              Collapsible navigation sections in sidebars or menus.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Accessibility</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>Keyboard accessible (Space/Enter to toggle)</li>
            <li>ARIA attributes automatically managed</li>
            <li>Screen reader announcements for state changes</li>
            <li>Focus management handled by Radix UI</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
