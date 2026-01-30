import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  DiffIcon,
  EditIcon,
  FileTextIcon,
  GitHubIcon,
  GraphQLIcon,
  GridIcon,
  HiveLogo,
  KeyIcon,
  LogOutIcon,
  PackageIcon,
  PlusIcon,
  PulseIcon,
  SaveIcon,
  SettingsIcon,
  ShareIcon,
  SlackIcon,
  TrashIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from '@/components/ui/icon';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Icon',
};

export const AllIcons: Story = () => (
  <div className="grid grid-cols-6 gap-6 p-8">
    <div className="flex flex-col items-center gap-2">
      <HiveLogo className="size-10" />
      <span className="text-neutral-11 text-xs">HiveLogo</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GraphQLIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">GraphQL</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SaveIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Save</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <TrendingUpIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">TrendingUp</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PlusIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Plus</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CalendarIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Calendar</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <UsersIcon className="text-neutral-12" size={24} />
      <span className="text-neutral-11 text-xs">Users</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <EditIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Edit</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <TrashIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Trash</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <ShareIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Share</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CopyIcon className="text-neutral-12" size={24} />
      <span className="text-neutral-11 text-xs">Copy</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <CheckIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Check</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GridIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Grid</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SettingsIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Settings</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <FileTextIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">FileText</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <LogOutIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">LogOut</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <KeyIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Key</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <XIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">X</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <GitHubIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">GitHub</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <SlackIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Slack</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <AlertTriangleIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">AlertTriangle</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <PulseIcon className="text-neutral-12 size-6" />
      <span className="text-neutral-11 text-xs">Pulse</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <DiffIcon className="text-neutral-12 size-6" />
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
  <div className="flex items-end gap-8 p-8">
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
  <div className="flex gap-8 p-8">
    <GraphQLIcon className="text-neutral-12 size-10" />
    <GraphQLIcon className="text-neutral-2 size-10" />
    <GraphQLIcon className="size-10 text-emerald-500" />
    <GraphQLIcon className="size-10 text-blue-500" />
    <GraphQLIcon className="size-10 text-orange-500" />
  </div>
);

WithColors.meta = {
  description: 'Icons with different colors via text-* classes',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-6xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Icon Components</h2>
      <p className="text-neutral-11 mb-4">
        Collection of custom SVG icons used throughout GraphQL Hive. All icons use currentColor for
        easy color customization via text-* classes.
      </p>

      <div className="grid grid-cols-8 gap-4">
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <HiveLogo className="size-8" />
          <span className="text-neutral-11 text-center text-xs">HiveLogo</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <GraphQLIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">GraphQL</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <SaveIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">Save</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <EditIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">Edit</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <TrashIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">Trash</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <SettingsIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">Settings</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <KeyIcon className="text-neutral-12 size-6" />
          <span className="text-neutral-11 text-center text-xs">Key</span>
        </div>
        <div className="bg-neutral-1 flex flex-col items-center gap-2 rounded-sm p-2">
          <UsersIcon className="text-neutral-12" size={24} />
          <span className="text-neutral-11 text-center text-xs">Users</span>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Patterns</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Size Control</p>
          <div className="mb-2 flex items-end gap-4">
            <CheckIcon className="text-neutral-12 size-4" />
            <CheckIcon className="text-neutral-12 size-6" />
            <CheckIcon className="text-neutral-12 size-8" />
          </div>
          <p className="text-neutral-10 text-xs">
            Use <code className="text-neutral-12">className="size-*"</code> to control size. Some
            icons accept <code className="text-neutral-12">size</code> prop (number in px).
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Color Control</p>
          <div className="mb-2 flex gap-4">
            <AlertTriangleIcon className="size-6 text-orange-500" />
            <CheckIcon className="size-6 text-emerald-500" />
            <XIcon className="size-6 text-red-500" />
            <KeyIcon className="text-neutral-2 size-6" />
          </div>
          <p className="text-neutral-10 text-xs">
            Icons use <code className="text-neutral-12">currentColor</code>, controlled via{' '}
            <code className="text-neutral-12">text-*</code> classes.
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">In Buttons</p>
          <div className="mb-2 flex gap-2">
            <button className="bg-neutral-3 text-neutral-12 flex items-center gap-2 rounded-sm px-3 py-2 text-sm">
              <SaveIcon className="size-4" />
              Save
            </button>
            <button className="bg-neutral-3 text-neutral-12 flex items-center gap-2 rounded-sm px-3 py-2 text-sm">
              <TrashIcon className="size-4" />
              Delete
            </button>
          </div>
          <p className="text-neutral-10 text-xs">
            Common pattern: icon + text in buttons, typically size-4
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Icon List</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <div className="text-neutral-10 grid grid-cols-3 gap-2 text-xs">
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
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 mb-2 text-xs">Most icons accept:</p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - CSS classes for
            size, color, etc.
          </li>
        </ul>
        <p className="text-neutral-10 mt-2 text-xs">
          Some icons (UsersIcon, CopyIcon, PackageIcon, etc.) also accept:
        </p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            <code className="text-neutral-12">size</code>: number - Size in pixels
          </li>
        </ul>
      </div>
    </div>
  </div>
);
