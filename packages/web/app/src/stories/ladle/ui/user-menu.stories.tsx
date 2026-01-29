import type { Story } from '@ladle/react';
import { LeaveOrganizationModalContent } from '@/components/ui/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/v2';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { FaGithub, FaGoogle, FaKey, FaUsersSlash } from 'react-icons/fa';
import {
  CalendarIcon,
  FileTextIcon,
  GridIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from '@/components/ui/icon';

// Simplified user menu without GraphQL dependencies
export const GoogleUser: Story = () => (
  <div className="p-4 flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Avatar shape="circle" className="border-accent_80 border-2" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="truncate text-sm font-medium leading-none">John Doe</div>
            <div className="text-neutral-10 truncate text-xs font-normal leading-none">
              john.doe@example.com
            </div>
          </div>
          <div>
            <FaGoogle title="Signed in using Google" />
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
            <DropdownMenuItem active>my-org</DropdownMenuItem>
            <DropdownMenuItem>acme-corp</DropdownMenuItem>
            <DropdownMenuItem>demo-org</DropdownMenuItem>
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
  </div>
);

GoogleUser.meta = {
  description: 'User menu with Google authentication',
};

export const GithubUser: Story = () => (
  <div className="p-4 flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Avatar shape="circle" className="border-accent_80 border-2" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="truncate text-sm font-medium leading-none">John Doe</div>
            <div className="text-neutral-10 truncate text-xs font-normal leading-none">
              john.doe@example.com
            </div>
          </div>
          <div>
            <FaGithub title="Signed in using Github" />
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
            <DropdownMenuItem active>my-org</DropdownMenuItem>
            <DropdownMenuItem>open-source-proj</DropdownMenuItem>
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
  </div>
);

GithubUser.meta = {
  description: 'User menu with GitHub authentication',
};

export const PasswordUser: Story = () => (
  <div className="p-4 flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Avatar shape="circle" className="border-accent_80 border-2" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="truncate text-sm font-medium leading-none">John Doe</div>
            <div className="text-neutral-10 truncate text-xs font-normal leading-none">
              john.doe@example.com
            </div>
          </div>
          <div>
            <FaKey title="Signed in using username and password" />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
  </div>
);

PasswordUser.meta = {
  description: 'User menu with password authentication (no org switcher)',
};

export const AdminUser: Story = () => (
  <div className="p-4 flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Avatar shape="circle" className="border-accent_80 border-2" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="truncate text-sm font-medium leading-none">Admin User</div>
            <div className="text-neutral-10 truncate text-xs font-normal leading-none">
              admin@example.com
            </div>
          </div>
          <div>
            <FaGoogle title="Signed in using Google" />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
          <AlertTriangleIcon className="mr-2 size-4" />
          Status page
        </DropdownMenuItem>
        <DropdownMenuItem>
          <TrendingUpIcon className="mr-2 size-4" />
          Manage Instance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOutIcon className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

AdminUser.meta = {
  description: 'User menu for admin user (shows "Manage Instance" option)',
};

export const MultipleOrganizations: Story = () => (
  <div className="p-4 flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Avatar shape="circle" className="border-accent_80 border-2" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={5} align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <div className="truncate text-sm font-medium leading-none">John Doe</div>
            <div className="text-neutral-10 truncate text-xs font-normal leading-none">
              john.doe@example.com
            </div>
          </div>
          <div>
            <FaGithub title="Signed in using Github" />
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
            <DropdownMenuItem>personal</DropdownMenuItem>
            <DropdownMenuItem active>work-org</DropdownMenuItem>
            <DropdownMenuItem>client-project</DropdownMenuItem>
            <DropdownMenuItem>open-source</DropdownMenuItem>
            <DropdownMenuItem>demo-sandbox</DropdownMenuItem>
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
          <AlertTriangleIcon className="mr-2 size-4" />
          Status page
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <FaUsersSlash className="mr-2 size-4" />
          Leave organization
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOutIcon className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

MultipleOrganizations.meta = {
  description: 'User menu with multiple organizations (shows switcher and leave option)',
};

export const LeaveOrganizationModal: Story = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open Leave Organization Modal</Button>
      <LeaveOrganizationModalContent
        isOpen={isOpen}
        toggleModalOpen={() => setIsOpen(!isOpen)}
        organizationSlug="acme-corp"
        onSubmit={() => {
          console.log('Leaving organization...');
          setIsOpen(false);
        }}
      />
    </div>
  );
};

LeaveOrganizationModal.meta = {
  description: 'Leave organization confirmation modal',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">UserMenu Component</h2>
      <p className="text-neutral-11 mb-4">
        Complex dropdown menu component with user profile, organization switcher, navigation links,
        and authentication provider indicator. Built using DropdownMenu primitives with custom styling.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">User Menu Trigger</p>
          <div className="flex justify-end p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="cursor-pointer">
              <Avatar shape="circle" className="border-accent_80 border-2" />
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Trigger: Avatar with <code className="text-neutral-12">border-accent_80 border-2</code>
            <br />
            Cursor: <code className="text-neutral-12">cursor-pointer</code>
            <br />
            Border: Accent color at 80% opacity
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Dropdown Menu Structure</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ul className="text-xs text-neutral-10 space-y-1">
              <li>
                1. <strong className="text-neutral-12">Header:</strong> User name, email, auth
                provider icon
              </li>
              <li>
                2. <strong className="text-neutral-12">Organization Switcher:</strong> Submenu with
                org list
              </li>
              <li>
                3. <strong className="text-neutral-12">Schedule meeting:</strong> Cal.com link
              </li>
              <li>
                4. <strong className="text-neutral-12">Profile settings:</strong> Opens modal
              </li>
              <li>
                5. <strong className="text-neutral-12">Theme Switcher:</strong> Conditional (feature
                flag)
              </li>
              <li>
                6. <strong className="text-neutral-12">Documentation:</strong> External link
              </li>
              <li>
                7. <strong className="text-neutral-12">Support:</strong> Conditional (Zendesk
                enabled)
              </li>
              <li>
                8. <strong className="text-neutral-12">Status page:</strong> External link
              </li>
              <li>
                9. <strong className="text-neutral-12">Manage Instance:</strong> Admin only
              </li>
              <li>
                10. <strong className="text-neutral-12">Leave organization:</strong> Conditional
                (canLeaveOrganization)
              </li>
              <li>
                11. <strong className="text-neutral-12">Log out:</strong> Always shown
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Menu Colors</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 space-y-3">
            <div>
              <div className="text-neutral-12 text-sm font-medium mb-1">Display Name</div>
              <p className="text-xs text-neutral-10">
                <code className="text-neutral-12">text-sm font-medium</code> (no color class,
                inherits neutral-12)
              </p>
            </div>
            <div>
              <div className="text-neutral-10 text-xs mb-1">john.doe@example.com</div>
              <p className="text-xs text-neutral-10">
                Email: <code className="text-neutral-12">text-neutral-10 text-xs font-normal</code>
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-3 hover:bg-neutral-4">
              <span className="text-neutral-12 text-sm">Menu Item (hover me)</span>
            </div>
            <p className="text-xs text-neutral-10">
              Items: Inherit menu item styles from DropdownMenuItem
              <br />
              Icons: <code className="text-neutral-12">mr-2 size-4</code> before text
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Authentication Provider Icons</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-neutral-3 rounded">
                <span className="text-sm">🔑</span>
              </div>
              <span className="text-xs text-neutral-10">Password</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-neutral-3 rounded">
                <span className="text-sm">G</span>
              </div>
              <span className="text-xs text-neutral-10">Google</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-neutral-3 rounded">
                <span className="text-sm">GH</span>
              </div>
              <span className="text-xs text-neutral-10">GitHub</span>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Icons from react-icons: <code className="text-neutral-12">FaKey, FaGoogle, FaGithub</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        LeaveOrganizationModalContent Component
      </h2>
      <p className="text-neutral-11 mb-4">
        Confirmation dialog for leaving an organization. Destructive action with warning message.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Modal Preview</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <LeaveOrganizationModal />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Content Structure</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ul className="text-xs text-neutral-10 space-y-1">
              <li>
                Title: <code className="text-neutral-12">Leave {'{organizationSlug}'}?</code>
              </li>
              <li>
                Description: Explains action with org slug in{' '}
                <code className="text-neutral-12">text-neutral-12 font-semibold</code>
              </li>
              <li>
                Warning: <code className="text-neutral-12">font-bold</code> - "This action is
                irreversible!"
              </li>
              <li>
                Footer: Cancel button (default) + Leave button (
                <code className="text-neutral-12">variant="destructive"</code>)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-neutral-11 text-sm font-medium mb-2">LeaveOrganizationModalContent</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">isOpen</code>: boolean
          </li>
          <li>
            <code className="text-neutral-12">toggleModalOpen</code>: () =&gt; void
          </li>
          <li>
            <code className="text-neutral-12">organizationSlug</code>: string
          </li>
          <li>
            <code className="text-neutral-12">onSubmit</code>: () =&gt; void
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Component Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            <strong className="text-neutral-12">DropdownMenu:</strong> Main dropdown container from
            UI primitives
          </li>
          <li>
            <strong className="text-neutral-12">DropdownMenuTrigger:</strong> Avatar button with
            accent border
          </li>
          <li>
            <strong className="text-neutral-12">DropdownMenuContent:</strong> Menu panel with{' '}
            <code className="text-neutral-12">min-w-[240px]</code>
          </li>
          <li>
            <strong className="text-neutral-12">DropdownMenuLabel:</strong> User name, email, and
            provider icon
          </li>
          <li>
            <strong className="text-neutral-12">DropdownMenuSub:</strong> Organization switcher
            submenu
          </li>
          <li>
            <strong className="text-neutral-12">DropdownMenuItem:</strong> Individual menu items with
            icons
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Conditional Features</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            <strong className="text-neutral-12">Organization switcher:</strong> Only if{' '}
            <code className="text-neutral-12">canSwitchOrganization</code> is true
          </li>
          <li>
            <strong className="text-neutral-12">Theme switcher:</strong> Only if{' '}
            <code className="text-neutral-12">env.featureFlags.themeSwitcher</code>
          </li>
          <li>
            <strong className="text-neutral-12">Support:</strong> Only if{' '}
            <code className="text-neutral-12">env.zendeskSupport</code>
          </li>
          <li>
            <strong className="text-neutral-12">Manage Instance:</strong> Only if{' '}
            <code className="text-neutral-12">me.isAdmin</code>
          </li>
          <li>
            <strong className="text-neutral-12">Dev GraphiQL:</strong> Only in development (
            <code className="text-neutral-12">env.nodeEnv === 'development'</code>)
          </li>
          <li>
            <strong className="text-neutral-12">Leave organization:</strong> Only if{' '}
            <code className="text-neutral-12">canLeaveOrganization</code>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Notes</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>Always rendered in layout headers (organization, project, target layouts)</li>
          <li>
            Includes Changelog component and GetStartedProgress beside avatar in{' '}
            <code className="text-neutral-12">flex gap-8</code>
          </li>
          <li>
            Dropdown menu has <code className="text-neutral-12">min-w-[240px]</code>
          </li>
          <li>
            Submenu for org switcher has <code className="text-neutral-12">max-w-[300px]</code>
          </li>
          <li>
            Active organization in switcher uses{' '}
            <code className="text-neutral-12">active</code> prop
          </li>
          <li>External links open in new tab with noreferrer</li>
          <li>
            Leave organization uses{' '}
            <code className="text-neutral-12">LeaveOrganizationModal_LeaveOrganizationMutation</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
);
