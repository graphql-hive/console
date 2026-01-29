import React from 'react';
import type { Story } from '@ladle/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export const Default: Story = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline">Open Sheet</Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Sheet Title</SheetTitle>
        <SheetDescription>This is a sheet component that slides from the right.</SheetDescription>
      </SheetHeader>
      <div className="py-4">
        <p className="text-neutral-11 text-sm">Sheet content goes here.</p>
      </div>
    </SheetContent>
  </Sheet>
);

export const WithForm: Story = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button>Edit Profile</Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit Profile</SheetTitle>
        <SheetDescription>Make changes to your profile here.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Alice Johnson" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="alice@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Input id="bio" placeholder="Tell us about yourself..." />
        </div>
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="ghost">Cancel</Button>
        </SheetClose>
        <Button>Save changes</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

export const AllSides: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Left Side</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Left Sheet</SheetTitle>
          <SheetDescription>Slides in from the left.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>

    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Right Side</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Right Sheet</SheetTitle>
          <SheetDescription>Slides in from the right (default).</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>

    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Top Side</Button>
      </SheetTrigger>
      <SheetContent side="top">
        <SheetHeader>
          <SheetTitle>Top Sheet</SheetTitle>
          <SheetDescription>Slides in from the top.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>

    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Bottom Side</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Bottom Sheet</SheetTitle>
          <SheetDescription>Slides in from the bottom.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  </div>
);

// Based on usage in target/insights/Filters.tsx
export const FilterPanel: Story = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedOperations, setSelectedOperations] = React.useState<Set<string>>(new Set());

  const operations = [
    'GetUser',
    'ListUsers',
    'CreateUser',
    'UpdateUser',
    'DeleteUser',
    'GetProducts',
    'SearchProducts',
  ];

  const filteredOperations = operations.filter(op =>
    op.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          Filter by operation {selectedOperations.size > 0 && `(${selectedOperations.size})`}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Filter by operation</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col space-y-3 py-4">
          <Input
            placeholder="Search for operation..."
            onChange={e => setSearchTerm(e.target.value)}
            value={searchTerm}
          />
          <div className="flex-1 space-y-2 overflow-y-auto">
            {filteredOperations.map(operation => (
              <label
                key={operation}
                className="flex items-center gap-2 rounded p-2 hover:bg-neutral-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedOperations.has(operation)}
                  onChange={e => {
                    const updated = new Set(selectedOperations);
                    if (e.target.checked) {
                      updated.add(operation);
                    } else {
                      updated.delete(operation);
                    }
                    setSelectedOperations(updated);
                  }}
                />
                <span className="text-neutral-11 text-sm">{operation}</span>
              </label>
            ))}
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => setSelectedOperations(new Set())}>
            Clear
          </Button>
          <SheetClose asChild>
            <Button>Apply Filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// Based on usage in organization/settings/access-tokens/create-access-token-sheet-content.tsx
export const CreateAccessToken: Story = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Create Access Token</Button>
      </SheetTrigger>
      <SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
        <SheetHeader>
          <SheetTitle>Create Access Token</SheetTitle>
          <SheetDescription>
            Create a new access token with specified permissions and optionally assigned resources.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="token-name">Token Name</Label>
            <Input id="token-name" placeholder="My API Token" />
            <p className="text-neutral-10 text-xs">
              A descriptive name to help you identify this token.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2 rounded border border-neutral-6 p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" />
                <span className="text-neutral-11 text-sm">Read schema</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" />
                <span className="text-neutral-11 text-sm">Push schema</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" />
                <span className="text-neutral-11 text-sm">Read operations</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Expiration</Label>
            <Input id="expiry" type="date" />
            <p className="text-neutral-10 text-xs">
              Optional: Set an expiration date for this token.
            </p>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button>Create Token</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export const Controlled: Story = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Open Controlled Sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Controlled Sheet</SheetTitle>
            <SheetDescription>This sheet is controlled by external state.</SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Button onClick={() => setOpen(false)}>Close from inside</Button>
          </div>
        </SheetContent>
      </Sheet>
      <p className="text-neutral-11 text-sm">Sheet is currently: {open ? 'Open' : 'Closed'}</p>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        Toggle from outside
      </Button>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Sheet Component</h2>
      <p className="text-neutral-11 mb-4">
        Slide-out panel that appears from the edge of the screen. Built with Radix UI Dialog.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Sheet</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex items-start">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Title</SheetTitle>
                  <SheetDescription>Description</SheetDescription>
                </SheetHeader>
                <p className="text-neutral-11 text-sm py-4">Content</p>
              </SheetContent>
            </Sheet>
          </div>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-neutral-3</code>
            <br />
            Padding: <code className="text-neutral-12">p-6</code>
            <br />
            Default side: <code className="text-neutral-12">right</code>
            <br />
            Default width: <code className="text-neutral-12">w-3/4 sm:max-w-sm</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Overlay</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-xs text-neutral-10">
              Overlay background: <code className="text-neutral-12">bg-neutral-1.01</code>
              <br />
              Backdrop blur: <code className="text-neutral-12">backdrop-blur-sm</code>
              <br />
              Can be disabled with: <code className="text-neutral-12">noOverlay</code> prop
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Close Button</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-xs text-neutral-10">
              Position: <code className="text-neutral-12">absolute right-4 top-4</code>
              <br />
              Icon: <code className="text-neutral-12">X</code> from lucide-react
              <br />
              Text color: <code className="text-neutral-12">text-neutral-11</code>
              <br />
              Hover: <code className="text-neutral-12">hover:text-neutral-12</code>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">Sheet</code>: Root container (manages open state)
          </li>
          <li>
            <code className="text-neutral-12">SheetTrigger</code>: Button that opens sheet
          </li>
          <li>
            <code className="text-neutral-12">SheetContent</code>: Sliding panel content
          </li>
          <li>
            <code className="text-neutral-12">SheetHeader</code>: Header section
          </li>
          <li>
            <code className="text-neutral-12">SheetTitle</code>: Title text
          </li>
          <li>
            <code className="text-neutral-12">SheetDescription</code>: Description text
          </li>
          <li>
            <code className="text-neutral-12">SheetFooter</code>: Footer with action buttons
          </li>
          <li>
            <code className="text-neutral-12">SheetClose</code>: Close trigger
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Sides</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">side="right"</code> - Slides from right (default),
            full height
          </li>
          <li>
            <code className="text-neutral-12">side="left"</code> - Slides from left, full height
          </li>
          <li>
            <code className="text-neutral-12">side="top"</code> - Slides from top, full width
          </li>
          <li>
            <code className="text-neutral-12">side="bottom"</code> - Slides from bottom, full width
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Animation</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10">
          Open duration: <code className="text-neutral-12">500ms</code>
          <br />
          Close duration: <code className="text-neutral-12">300ms</code>
          <br />
          Slide animation direction based on side
          <br />
          Overlay: fade in/out animation
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Filter Panels</p>
          <p className="text-neutral-10 text-xs">
            Used in insights and traces for filtering operations, clients, and other data. Includes
            search input and checkboxes.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Create/Edit Forms</p>
          <p className="text-neutral-10 text-xs">
            Used for creating access tokens, editing settings, and other form-based interactions.
            Wide sheets (min-w-[700px]) for complex forms.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Detail Views</p>
          <p className="text-neutral-10 text-xs">
            Showing detailed information about tokens, members, or other entities without
            navigating away.
          </p>
        </div>
      </div>
    </div>
  </div>
);
