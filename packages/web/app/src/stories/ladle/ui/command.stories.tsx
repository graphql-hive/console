import React from 'react';
import type { Story } from '@ladle/react';
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  CreditCardIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const Default: Story = () => (
  <div className="max-w-md">
    <Command>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon className="mr-2 size-4" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem>
            <UserIcon className="mr-2 size-4" />
            <span>Search Users</span>
          </CommandItem>
          <CommandItem>
            <SettingsIcon className="mr-2 size-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
);

export const WithKeyboardShortcuts: Story = () => (
  <div className="max-w-md">
    <Command>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem>
            <span>New Schema Version</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>View History</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <span>Search Operations</span>
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
);

export const WithMultipleGroups: Story = () => (
  <div className="max-w-md">
    <Command>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Organization">
          <CommandItem>
            <UserIcon className="mr-2 size-4" />
            <span>Manage Members</span>
          </CommandItem>
          <CommandItem>
            <SettingsIcon className="mr-2 size-4" />
            <span>Organization Settings</span>
          </CommandItem>
          <CommandItem>
            <CreditCardIcon className="mr-2 size-4" />
            <span>Billing</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Project">
          <CommandItem>
            <span>Create New Target</span>
          </CommandItem>
          <CommandItem>
            <span>View All Targets</span>
          </CommandItem>
          <CommandItem>
            <span>Project Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Schema">
          <CommandItem>
            <span>Push Schema</span>
          </CommandItem>
          <CommandItem>
            <span>View History</span>
          </CommandItem>
          <CommandItem>
            <span>Schema Explorer</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
);

// Based on usage in pages/target.tsx and stories/schema-filter.stories.tsx
export const SearchableCombobox: Story = () => {
  const [open, setOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  const services = [
    { id: '1', name: 'User Service', url: 'http://users.api.local/graphql' },
    { id: '2', name: 'Product Service', url: 'http://products.api.local/graphql' },
    { id: '3', name: 'Order Service', url: 'http://orders.api.local/graphql' },
    { id: '4', name: 'Payment Service', url: 'http://payments.api.local/graphql' },
    { id: '5', name: 'Inventory Service', url: 'http://inventory.api.local/graphql' },
    { id: '6', name: 'Shipping Service', url: 'http://shipping.api.local/graphql' },
  ];

  const handleReset = () => {
    setSelectedService('');
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-[400px] justify-between">
            {selectedService
              ? services.find(s => s.name === selectedService)?.name
              : 'Filter schema by service...'}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] truncate p-0">
          <Command>
            <CommandInput
              closeFn={handleReset}
              placeholder="Search service..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>No service found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="relative h-80 w-full">
                {services.map(service => (
                  <CommandItem
                    key={service.id}
                    value={service.name}
                    onSelect={serviceName => {
                      setSelectedService(serviceName);
                      setSearchTerm(serviceName);
                      setOpen(false);
                    }}
                    className="cursor-pointer truncate"
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        selectedService === service.name ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{service.name}</span>
                      <span className="text-neutral-11 text-xs">{service.url}</span>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedService && (
        <p className="text-neutral-11 text-sm">
          Selected service: <span className="text-neutral-12 font-medium">{selectedService}</span>
        </p>
      )}
    </div>
  );
};

// Based on usage in target/proposals/user-filter.tsx
export const UserFilter: Story = () => {
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>(['user-1', 'user-3']);

  const users = [
    { id: 'user-1', displayName: 'Alice Johnson', fullName: 'Alice M. Johnson' },
    { id: 'user-2', displayName: 'Bob Smith', fullName: 'Robert Smith' },
    { id: 'user-3', displayName: 'Carol Williams', fullName: 'Carol A. Williams' },
    { id: 'user-4', displayName: 'David Brown', fullName: 'David J. Brown' },
    { id: 'user-5', displayName: 'Eve Davis', fullName: 'Eve L. Davis' },
    { id: 'user-6', displayName: 'Frank Miller', fullName: 'Frank R. Miller' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-md">
        <Command>
          <CommandInput placeholder="Search org members..." />
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="relative max-h-80">
              {users.map(user => {
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={`${user.id} ${user.displayName ?? user.fullName}`}
                    onSelect={selectedValue => {
                      const userId = selectedValue.split(' ')[0];
                      setSelectedUsers(prev => {
                        const updated = [...prev];
                        const idx = updated.findIndex(u => u === userId);
                        if (idx >= 0) {
                          updated.splice(idx, 1);
                        } else {
                          updated.push(userId);
                        }
                        return updated;
                      });
                    }}
                  >
                    <Check
                      className={cn('mr-2 size-4', isSelected ? 'opacity-100' : 'opacity-0')}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.displayName}</span>
                      <span className="text-neutral-11 text-xs">{user.fullName}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </div>
      <div className="text-sm">
        <p className="text-neutral-11">
          Selected users: {selectedUsers.length > 0 ? selectedUsers.length : 'None'}
        </p>
        {selectedUsers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedUsers.map(userId => {
              const user = users.find(u => u.id === userId);
              return (
                <span
                  key={userId}
                  className="bg-neutral-3 text-neutral-12 rounded px-2 py-1 text-xs"
                >
                  {user?.displayName}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const FilteringExample: Story = () => {
  return (
    <div className="max-w-md">
      <Command>
        <CommandInput placeholder="Type to filter..." />
        <CommandList>
          <CommandEmpty>No matching items found.</CommandEmpty>
          <CommandGroup heading="GraphQL Types">
            <CommandItem>Query</CommandItem>
            <CommandItem>Mutation</CommandItem>
            <CommandItem>Subscription</CommandItem>
            <CommandItem>Object</CommandItem>
            <CommandItem>Interface</CommandItem>
            <CommandItem>Union</CommandItem>
            <CommandItem>Enum</CommandItem>
            <CommandItem>Scalar</CommandItem>
            <CommandItem>Input Object</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Command Component</h2>
      <p className="text-neutral-11 mb-4">
        Fast, composable command menu built with cmdk. Used for searchable lists, command palettes,
        and filterable dropdowns.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Command Menu</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-md">
              <Command>
                <CommandInput placeholder="Search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Quick Actions">
                    <CommandItem>Create New Target</CommandItem>
                    <CommandItem>Push Schema</CommandItem>
                    <CommandItem>View Analytics</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-neutral-4</code>
            <br />
            Text: <code className="text-neutral-12">text-neutral-11</code>
            <br />
            Input border: <code className="text-neutral-12">border-b</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Selected State</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-md">
              <Command>
                <CommandInput placeholder="Arrow down to select..." />
                <CommandList>
                  <CommandGroup>
                    <CommandItem>First item (navigate with arrows)</CommandItem>
                    <CommandItem>Second item</CommandItem>
                    <CommandItem>Third item</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Selected: <code className="text-neutral-12">aria-selected:bg-accent</code>
            <br />
            Selected text: <code className="text-neutral-12">aria-selected:text-neutral-12</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Empty State</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="max-w-md">
              <Command>
                <CommandInput placeholder="Search for something that doesn't exist..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="hidden">This won't match</CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Empty state shows when no items match the search
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">Command</code>: Root container with search/filter
            logic
          </li>
          <li>
            <code className="text-neutral-12">CommandInput</code>: Search input with icon
          </li>
          <li>
            <code className="text-neutral-12">CommandList</code>: Scrollable list container
            (max-h-[300px])
          </li>
          <li>
            <code className="text-neutral-12">CommandEmpty</code>: Empty state when no matches
          </li>
          <li>
            <code className="text-neutral-12">CommandGroup</code>: Grouped items with optional
            heading
          </li>
          <li>
            <code className="text-neutral-12">CommandItem</code>: Individual selectable item
          </li>
          <li>
            <code className="text-neutral-12">CommandSeparator</code>: Visual divider between
            groups
          </li>
          <li>
            <code className="text-neutral-12">CommandShortcut</code>: Keyboard shortcut display
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Patterns</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Combobox Pattern</p>
          <p className="text-neutral-10 text-xs">
            Wrap Command in Popover + PopoverTrigger for searchable dropdown. Used in schema
            filters, service selectors, and user pickers.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Multi-Select Pattern</p>
          <p className="text-neutral-10 text-xs">
            Track selected items in state array. Show check icon for selected items. Allow
            toggling on select. Used for filtering by multiple users or tags.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Command Palette Pattern</p>
          <p className="text-neutral-10 text-xs">
            Use CommandDialog for full-screen command palette (⌘K). Group actions by category with
            keyboard shortcuts.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Keyboard Navigation</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">↑/↓</code> - Navigate items
          </li>
          <li>
            <code className="text-neutral-12">Enter</code> - Select highlighted item
          </li>
          <li>
            <code className="text-neutral-12">Esc</code> - Close (when in dialog)
          </li>
          <li>
            <code className="text-neutral-12">Type</code> - Filter items
          </li>
        </ul>
      </div>
    </div>
  </div>
);
