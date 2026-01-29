import React from 'react';
import {
  AlertTriangleIcon,
  CalendarIcon,
  FileTextIcon,
  GridIcon,
  LifeBuoyIcon,
  LogOutIcon,
  Monitor,
  Moon,
  PlusIcon,
  SettingsIcon,
  Sun,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Dropdown Menu',
};

export const Default: Story = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Open Menu</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Profile</DropdownMenuItem>
      <DropdownMenuItem>Settings</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Log out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const WithIcons: Story = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Actions</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>
        <CalendarIcon className="mr-2 size-4" />
        Schedule Meeting
      </DropdownMenuItem>
      <DropdownMenuItem>
        <FileTextIcon className="mr-2 size-4" />
        Documentation
      </DropdownMenuItem>
      <DropdownMenuItem>
        <SettingsIcon className="mr-2 size-4" />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <LogOutIcon className="mr-2 size-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const WithShortcuts: Story = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">Commands</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-56">
      <DropdownMenuItem>
        Push Schema
        <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        View History
        <DropdownMenuShortcut>⌘H</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        Settings
        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        Search Operations
        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// Based on usage in components/ui/user-menu.tsx
export const UserMenu: Story = () => {
  const [selectedOrg, setSelectedOrg] = React.useState('my-org');

  const organizations = [
    { slug: 'my-org', name: 'My Organization' },
    { slug: 'acme-corp', name: 'ACME Corporation' },
    { slug: 'graphql-hive', name: 'GraphQL Hive' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="size-10 rounded-full p-0">
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex flex-col space-y-1">
          <div className="truncate text-sm font-medium leading-none">Alice Johnson</div>
          <div className="text-neutral-10 truncate text-xs font-normal leading-none">
            alice@example.com
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <GridIcon className="mr-2 size-4" />
            Switch organization
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-w-[300px]">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map(org => (
              <DropdownMenuItem
                key={org.slug}
                active={selectedOrg === org.slug}
                onClick={() => setSelectedOrg(org.slug)}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Create organization
              <PlusIcon className="ml-2 size-4" />
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <CalendarIcon className="mr-2 size-4" />
          Schedule a meeting
        </DropdownMenuItem>
        <DropdownMenuItem>
          <SettingsIcon className="mr-2 size-4" />
          Profile settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <FileTextIcon className="mr-2 size-4" />
          Documentation
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoyIcon className="mr-2 size-4" />
          Support
        </DropdownMenuItem>
        <DropdownMenuItem>
          <AlertTriangleIcon className="mr-2 size-4" />
          Status page
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOutIcon className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Based on usage in components/theme/theme-switcher.tsx
export const ThemeSwitcher: Story = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('system');

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Settings</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <SettingsIcon className="mr-2 size-4" />
          Preferences
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'dark' ? <Moon className="mr-2 size-4" /> : <Sun className="mr-2 size-4" />}
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={v => setTheme(v as typeof theme)}
              >
                {themes.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon className="mr-2 size-4" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Based on usage in components/target/explorer/filter.tsx
export const CheckboxItems: Story = () => {
  const [selectedTypes, setSelectedTypes] = React.useState<Set<string>>(
    new Set(['query', 'mutation']),
  );

  const types = [
    { id: 'query', label: 'Query' },
    { id: 'mutation', label: 'Mutation' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'object', label: 'Object Type' },
    { id: 'interface', label: 'Interface' },
    { id: 'union', label: 'Union' },
    { id: 'enum', label: 'Enum' },
    { id: 'scalar', label: 'Scalar' },
  ];

  const preventTheDefault = (e: Event) => {
    e.preventDefault();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Filter Types {selectedTypes.size > 0 && `(${selectedTypes.size})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>GraphQL Types</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {types.map(type => (
            <DropdownMenuCheckboxItem
              key={type.id}
              checked={selectedTypes.has(type.id)}
              onCheckedChange={isChecked => {
                setSelectedTypes(prev => {
                  const updated = new Set(prev);
                  if (isChecked) {
                    updated.add(type.id);
                  } else {
                    updated.delete(type.id);
                  }
                  return updated;
                });
              }}
              onSelect={preventTheDefault}
            >
              {type.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const RadioGroup: Story = () => {
  const [sortBy, setSortBy] = React.useState('name');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Sort By</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="date">Date Created</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="modified">Last Modified</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const WithSubMenu: Story = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline">More Options</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-56">
      <DropdownMenuItem>New Schema</DropdownMenuItem>
      <DropdownMenuItem>View History</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>Email</DropdownMenuItem>
          <DropdownMenuItem>Copy Link</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Slack</DropdownMenuItem>
          <DropdownMenuItem>Discord</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem>Export as JSON</DropdownMenuItem>
          <DropdownMenuItem>Export as SDL</DropdownMenuItem>
          <DropdownMenuItem>Export as PDF</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Dropdown Menu Component</h2>
      <p className="text-neutral-11 mb-4">
        Context menu built with Radix UI. Displays a list of actions when triggered.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Menu</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-neutral-10 text-xs">
            Content background: <code className="text-neutral-12">bg-neutral-4</code>
            <br />
            Content text: <code className="text-neutral-12">text-neutral-11</code>
            <br />
            Border: <code className="text-neutral-12">border-neutral-5</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Item States</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Hover Items</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Normal Item (hover me)</DropdownMenuItem>
                <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
                <DropdownMenuItem>Another Item</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-neutral-10 text-xs">
            Focus/hover: <code className="text-neutral-12">focus:bg-neutral-5</code>
            <br />
            Focus text: <code className="text-neutral-12">focus:text-neutral-12</code>
            <br />
            Disabled: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Checkbox Items</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Select Options</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem checked>Status Bar</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked>Activity Bar</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Panel</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-neutral-10 text-xs">
            Checkbox uses <code className="text-neutral-12">Check</code> icon when checked
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Radio Group</p>
          <div className="bg-neutral-1 border-neutral-6 flex items-start rounded-sm border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Select One</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value="option1">
                  <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="option3">Option 3</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-neutral-10 text-xs">
            Radio uses filled <code className="text-neutral-12">Circle</code> icon when selected
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">DropdownMenu</code>: Root container
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuTrigger</code>: Button that opens menu
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuContent</code>: Menu content container
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuItem</code>: Individual menu item
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuLabel</code>: Section heading
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuSeparator</code>: Visual divider
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuCheckboxItem</code>: Checkbox menu item
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuRadioGroup/RadioItem</code>: Radio
            selection
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuSub/SubTrigger/SubContent</code>: Nested
            sub-menus
          </li>
          <li>
            <code className="text-neutral-12">DropdownMenuShortcut</code>: Keyboard shortcut display
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Animation</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 text-xs">
          Slide-in animation: <code className="text-neutral-12">animate-in</code>
          <br />
          Direction-based:{' '}
          <code className="text-neutral-12">data-[side=bottom]:slide-in-from-top-2</code>
          <br />
          Supports all sides: top, bottom, left, right
        </p>
      </div>
    </div>
  </div>
);
