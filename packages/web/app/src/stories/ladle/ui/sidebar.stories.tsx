import type { Story } from '@ladle/react';
import {
  FileIcon,
  HomeIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export const Default: Story = () => (
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-neutral-12 px-4 text-lg font-semibold">My App</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <HomeIcon className="size-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <FileIcon className="size-4" />
                  <span>Documents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <UserIcon className="size-4" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <SettingsIcon className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-neutral-10 text-xs">v1.0.0</div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <div className="flex h-screen flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger />
          <h1 className="text-neutral-12 text-lg font-semibold">Page Content</h1>
        </header>
        <main className="flex-1 p-6">
          <p className="text-neutral-11">
            Click the menu icon to toggle the sidebar. Use <kbd>⌘B</kbd> or <kbd>Ctrl+B</kbd> to
            toggle with keyboard.
          </p>
        </main>
      </div>
    </SidebarInset>
  </SidebarProvider>
);

export const WithGroups: Story = () => (
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-neutral-12 px-4 text-lg font-semibold">GraphQL Hive</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Overview</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Members</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Settings</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>API Gateway</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Mobile App</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Admin Portal</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Documentation</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>Support</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      <div className="flex h-screen flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger />
          <h1 className="text-neutral-12 text-lg font-semibold">Dashboard</h1>
        </header>
        <main className="flex-1 p-6">
          <p className="text-neutral-11">Main content area</p>
        </main>
      </div>
    </SidebarInset>
  </SidebarProvider>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Sidebar Component</h2>
      <p className="text-neutral-11 mb-4">
        Collapsible sidebar navigation with keyboard shortcut support. Features expanded and
        collapsed states.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Layout</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-xs text-neutral-10">
              Uses <code className="text-neutral-12">SidebarProvider</code> context to manage state
              <br />
              Sidebar + SidebarInset for two-column layout
              <br />
              Keyboard shortcut: <code className="text-neutral-12">⌘B / Ctrl+B</code>
              <br />
              Persists state in cookies
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Dimensions</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-xs text-neutral-10">
              Expanded width: <code className="text-neutral-12">16rem</code> (desktop)
              <br />
              Mobile width: <code className="text-neutral-12">18rem</code>
              <br />
              Collapsed width: <code className="text-neutral-12">3rem</code> (icon-only)
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
            <code className="text-neutral-12">SidebarProvider</code>: Context provider for sidebar
            state
          </li>
          <li>
            <code className="text-neutral-12">Sidebar</code>: Main sidebar container
          </li>
          <li>
            <code className="text-neutral-12">SidebarHeader</code>: Top section (logo, title)
          </li>
          <li>
            <code className="text-neutral-12">SidebarContent</code>: Scrollable main content
          </li>
          <li>
            <code className="text-neutral-12">SidebarFooter</code>: Bottom section
          </li>
          <li>
            <code className="text-neutral-12">SidebarGroup</code>: Navigation group with label
          </li>
          <li>
            <code className="text-neutral-12">SidebarMenu/MenuItem/MenuButton</code>: Menu items
          </li>
          <li>
            <code className="text-neutral-12">SidebarTrigger</code>: Toggle button
          </li>
          <li>
            <code className="text-neutral-12">SidebarInset</code>: Main content area
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Features</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Collapsible</p>
          <p className="text-neutral-10 text-xs">
            Toggle between expanded and collapsed (icon-only) states. State persists across
            sessions via cookies.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Keyboard Shortcut</p>
          <p className="text-neutral-10 text-xs">
            Press <kbd>⌘B</kbd> (Mac) or <kbd>Ctrl+B</kbd> (Windows/Linux) to toggle sidebar from
            anywhere.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Mobile Support</p>
          <p className="text-neutral-10 text-xs">
            On mobile, sidebar appears as a sheet overlay instead of persistent column.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Tooltips</p>
          <p className="text-neutral-10 text-xs">
            In collapsed state, menu items show tooltips on hover to display full labels.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage in Codebase</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-neutral-11 text-sm mb-2">Used in traces pages for filter sidebars:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">pages/target-traces.tsx</code>: Trace filtering UI
          </li>
          <li>
            <code className="text-neutral-12">pages/traces/target-traces-filter.tsx</code>: Filter
            sidebar component
          </li>
        </ul>
      </div>
    </div>
  </div>
);
