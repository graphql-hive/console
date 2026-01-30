import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Popover',
};

export const Default: Story = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">Open Popover</Button>
    </PopoverTrigger>
    <PopoverContent>
      <div className="space-y-2">
        <h4 className="text-neutral-12 font-medium">Dimensions</h4>
        <p className="text-neutral-11 text-sm">Set the dimensions for the layer.</p>
      </div>
    </PopoverContent>
  </Popover>
);

export const WithArrow: Story = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">Show with Arrow</Button>
    </PopoverTrigger>
    <PopoverContent>
      <div className="space-y-2">
        <h4 className="text-neutral-12 font-medium">Info</h4>
        <p className="text-neutral-11 text-sm">
          This popover has an arrow pointing to the trigger.
        </p>
      </div>
      <PopoverArrow />
    </PopoverContent>
  </Popover>
);

export const WithForm: Story = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">Update Profile</Button>
    </PopoverTrigger>
    <PopoverContent className="w-80">
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-neutral-12 font-medium">Edit Profile</h4>
          <p className="text-neutral-11 text-sm">Update your profile information.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="your@email.com" />
          </div>
          <Button className="w-full">Save Changes</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export const Positioning: Story = () => (
  <div className="flex items-center justify-center gap-4 p-12">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Top</Button>
      </PopoverTrigger>
      <PopoverContent side="top">
        <p className="text-neutral-11 text-sm">Popover positioned on top</p>
        <PopoverArrow />
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Right</Button>
      </PopoverTrigger>
      <PopoverContent side="right">
        <p className="text-neutral-11 text-sm">Popover positioned on right</p>
        <PopoverArrow />
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Bottom</Button>
      </PopoverTrigger>
      <PopoverContent side="bottom">
        <p className="text-neutral-11 text-sm">Popover positioned on bottom</p>
        <PopoverArrow />
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Left</Button>
      </PopoverTrigger>
      <PopoverContent side="left">
        <p className="text-neutral-11 text-sm">Popover positioned on left</p>
        <PopoverArrow />
      </PopoverContent>
    </Popover>
  </div>
);

// Based on usage in target/history/errors-and-changes.tsx
export const InfoHover: Story = () => (
  <div className="flex flex-col gap-4">
    <p className="text-neutral-11 text-sm">
      Hover over the{' '}
      <Popover>
        <PopoverTrigger className="text-neutral-2 hover:text-neutral-2 hover:underline hover:underline-offset-4">
          operation name
        </PopoverTrigger>
        <PopoverContent side="right">
          <div className="flex flex-col gap-y-2 text-sm">
            <p className="text-neutral-12 font-medium">GetUser_Query</p>
            <p className="text-neutral-11">Hash: a1b2c3d4</p>
            <p className="text-neutral-11">Used in 3 targets</p>
          </div>
          <PopoverArrow />
        </PopoverContent>
      </Popover>{' '}
      to see more details.
    </p>

    <p className="text-neutral-11 text-sm">
      This{' '}
      <Popover>
        <PopoverTrigger className="text-neutral-2 hover:text-neutral-2 hover:underline hover:underline-offset-4">
          breaking change
        </PopoverTrigger>
        <PopoverContent side="top">
          <div className="space-y-2">
            <h5 className="text-neutral-12 text-sm font-medium">Breaking Change Details</h5>
            <p className="text-neutral-11 text-xs">
              Field 'User.email' was removed. This affects 12 operations across 3 clients.
            </p>
            <p className="text-neutral-11 text-xs">Consider using a deprecation period first.</p>
          </div>
          <PopoverArrow />
        </PopoverContent>
      </Popover>{' '}
      affects multiple operations.
    </p>
  </div>
);

// Based on usage in target/history/errors-and-changes.tsx
export const AffectedOperations: Story = () => (
  <div className="flex items-center gap-4">
    <p className="text-neutral-11 text-sm">Deployment affects</p>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="link" className="text-neutral-2 h-auto p-0">
          5 operations
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" className="w-80">
        <div className="space-y-2">
          <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
            <li className="text-neutral-11">GetUser</li>
            <li className="text-neutral-11">ListUsers</li>
            <li className="text-neutral-11">UpdateUser</li>
            <li className="text-neutral-11">DeleteUser</li>
            <li className="text-neutral-11">[anonymous] (a1b2c3d4...)</li>
          </ul>
        </div>
        <PopoverArrow />
      </PopoverContent>
    </Popover>
  </div>
);

export const Controlled: Story = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">Toggle Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="space-y-2">
            <h4 className="text-neutral-12 font-medium">Controlled Popover</h4>
            <p className="text-neutral-11 text-sm">This popover is controlled by external state.</p>
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-neutral-11 text-sm">Popover is currently: {open ? 'Open' : 'Closed'}</p>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Popover Component</h2>
      <p className="text-neutral-11 mb-4">
        Floating panel that appears next to a trigger element. Built with Radix UI Popover.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Popover</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <h4 className="text-neutral-12 font-medium">Popover Title</h4>
                  <p className="text-neutral-11 text-sm">This is the popover content area.</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-4</code>
            <br />
            Border: <code className="text-neutral-12">border-neutral-5</code>
            <br />
            Padding: <code className="text-neutral-12">p-4</code>
            <br />
            Width: <code className="text-neutral-12">w-72</code> (default)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Arrow</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">With Arrow</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-neutral-11 text-sm">Arrow points to trigger</p>
                <PopoverArrow />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-neutral-10 text-xs">
            Arrow fill: <code className="text-neutral-12">fill-neutral-5</code>
            <br />
            Arrow automatically adjusts position based on side
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Positioning</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-center justify-center gap-4 rounded-sm border p-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Side
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top">
                <p className="text-neutral-11 text-sm">Positioned on top</p>
                <PopoverArrow />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-neutral-10 text-xs">
            Side prop: <code className="text-neutral-12">top | right | bottom | left</code>
            <br />
            Align prop: <code className="text-neutral-12">start | center | end</code>
            <br />
            Side offset: <code className="text-neutral-12">sideOffset={4}</code> (default)
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">Popover</code>: Root container (manages open state)
          </li>
          <li>
            <code className="text-neutral-12">PopoverTrigger</code>: Element that triggers popover
            (often with asChild)
          </li>
          <li>
            <code className="text-neutral-12">PopoverContent</code>: Floating content panel
          </li>
          <li>
            <code className="text-neutral-12">PopoverArrow</code>: Optional arrow pointing to
            trigger
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Animation</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 text-xs">
          Open animation: <code className="text-neutral-12">fade-in-0 zoom-in-95</code>
          <br />
          Close animation: <code className="text-neutral-12">fade-out-0 zoom-out-95</code>
          <br />
          Slide animations based on side: <code className="text-neutral-12">slide-in-from-*</code>
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Info Tooltips</p>
          <p className="text-neutral-10 text-xs">
            Show additional context when hovering/clicking text links. Used for operation details,
            schema information, and metadata.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Forms and Settings</p>
          <p className="text-neutral-10 text-xs">
            Quick inline forms for editing settings, adding tags, or updating simple fields without
            navigating away.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Searchable Dropdowns</p>
          <p className="text-neutral-10 text-xs">
            Contains Command component for filterable selection. Used in schema filters, service
            selectors.
          </p>
        </div>
      </div>
    </div>
  </div>
);
