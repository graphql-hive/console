import type { Story } from '@ladle/react';
import {
  GraphQLIcon,
  SaveIcon,
  TrendingUpIcon,
  PlusIcon,
  CalendarIcon,
  UsersIcon,
  EditIcon,
  TrashIcon,
  ShareIcon,
  CopyIcon,
  CheckIcon,
  GridIcon,
  SettingsIcon,
  FileTextIcon,
  LogOutIcon,
  KeyIcon,
  XIcon,
  GitHubIcon,
  SlackIcon,
  AlertTriangleIcon,
  PulseIcon,
  DiffIcon,
  PackageIcon,
  HiveLogo,
} from '@/components/ui/icon';

export const AllIcons: Story = () => (
  <div className="p-8 grid grid-cols-6 gap-6">
    <div className="flex flex-col items-center gap-2">
      <HiveLogo className="size-10" />
      <span className="text-neutral-11 text-xs">HiveLogo</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GraphQLIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">GraphQL</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SaveIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Save</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <TrendingUpIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">TrendingUp</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PlusIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Plus</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CalendarIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Calendar</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <UsersIcon className="text-neutral-12" size={24} />
      <span className="text-neutral-11 text-xs">Users</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <EditIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Edit</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <TrashIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Trash</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <ShareIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Share</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CopyIcon className="text-neutral-12" size={24} />
      <span className="text-neutral-11 text-xs">Copy</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CheckIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Check</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GridIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Grid</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SettingsIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Settings</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <FileTextIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">FileText</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <LogOutIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">LogOut</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <KeyIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Key</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <XIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">X</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GitHubIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">GitHub</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SlackIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Slack</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <AlertTriangleIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">AlertTriangle</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PulseIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Pulse</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <DiffIcon className="size-6 text-neutral-12" />
      <span className="text-neutral-11 text-xs">Diff</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PackageIcon className="text-neutral-12" size={24} />
      <span className="text-neutral-11 text-xs">Package</span>
    </div>
  </div>
);

AllIcons.meta = {
  description: 'Showcase of all custom SVG icons in the UI library',
};

export const HiveLogoSizes: Story = () => (
  <div className="p-8 flex gap-8 items-end">
    <HiveLogo className="size-6" />
    <HiveLogo className="size-8" />
    <HiveLogo className="size-10" />
    <HiveLogo className="size-12" />
    <HiveLogo className="size-16" />
  </div>
);

HiveLogoSizes.meta = {
  description: 'HiveLogo at different sizes',
};

export const WithColors: Story = () => (
  <div className="p-8 flex gap-8">
    <GraphQLIcon className="size-10 text-neutral-12" />
    <GraphQLIcon className="size-10 text-accent" />
    <GraphQLIcon className="size-10 text-emerald-500" />
    <GraphQLIcon className="size-10 text-blue-500" />
    <GraphQLIcon className="size-10 text-orange-500" />
  </div>
);

WithColors.meta = {
  description: 'Icons with different colors via text-* classes',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-6xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Icon Components</h2>
      <p className="text-neutral-11 mb-4">
        Collection of custom SVG icons used throughout GraphQL Hive. All icons use currentColor
        for easy color customization via text-* classes.
      </p>

      <div className="grid grid-cols-8 gap-4">
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <HiveLogo className="size-8" />
          <span className="text-neutral-11 text-xs text-center">HiveLogo</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <GraphQLIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">GraphQL</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <SaveIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">Save</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <EditIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">Edit</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <TrashIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">Trash</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <SettingsIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">Settings</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <KeyIcon className="size-6 text-neutral-12" />
          <span className="text-neutral-11 text-xs text-center">Key</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2 bg-neutral-1 rounded">
          <UsersIcon className="text-neutral-12" size={24} />
          <span className="text-neutral-11 text-xs text-center">Users</span>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Patterns</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Size Control</p>
          <div className="flex gap-4 items-end mb-2">
            <CheckIcon className="size-4 text-neutral-12" />
            <CheckIcon className="size-6 text-neutral-12" />
            <CheckIcon className="size-8 text-neutral-12" />
          </div>
          <p className="text-xs text-neutral-10">
            Use <code className="text-neutral-12">className="size-*"</code> to control size.
            Some icons accept <code className="text-neutral-12">size</code> prop (number in px).
          </p>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Color Control</p>
          <div className="flex gap-4 mb-2">
            <AlertTriangleIcon className="size-6 text-orange-500" />
            <CheckIcon className="size-6 text-emerald-500" />
            <XIcon className="size-6 text-red-500" />
            <KeyIcon className="size-6 text-accent" />
          </div>
          <p className="text-xs text-neutral-10">
            Icons use <code className="text-neutral-12">currentColor</code>, controlled via{' '}
            <code className="text-neutral-12">text-*</code> classes.
          </p>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">In Buttons</p>
          <div className="flex gap-2 mb-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-neutral-3 rounded text-neutral-12 text-sm">
              <SaveIcon className="size-4" />
              Save
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-neutral-3 rounded text-neutral-12 text-sm">
              <TrashIcon className="size-4" />
              Delete
            </button>
          </div>
          <p className="text-xs text-neutral-10">
            Common pattern: icon + text in buttons, typically size-4
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Icon List</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <div className="grid grid-cols-3 gap-2 text-xs text-neutral-10">
          <div>HiveLogo, GraphQLIcon, SaveIcon</div>
          <div>TrendingUpIcon, PlusIcon, CalendarIcon</div>
          <div>UsersIcon, EditIcon, TrashIcon</div>
          <div>ShareIcon, CopyIcon, CheckIcon</div>
          <div>GridIcon, SettingsIcon, FileTextIcon</div>
          <div>LogOutIcon, KeyIcon, XIcon</div>
          <div>GitHubIcon, SlackIcon, AlertTriangleIcon</div>
          <div>PulseIcon, DiffIcon, PackageIcon</div>
          <div>And more...</div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10 mb-2">Most icons accept:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - CSS classes
            for size, color, etc.
          </li>
        </ul>
        <p className="text-xs text-neutral-10 mt-2">Some icons (UsersIcon, CopyIcon, PackageIcon, etc.) also accept:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">size</code>: number - Size in pixels
          </li>
        </ul>
      </div>
    </div>
  </div>
);
