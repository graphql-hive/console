import type { Story } from '@ladle/react';
import { ResourceDetails } from '@/components/ui/resource-details';

export const ProjectId: Story = () => (
  <div className="p-4">
    <ResourceDetails id="project_abc123def456ghi789" label="Project ID" />
  </div>
);

ProjectId.meta = {
  description: 'Resource details showing project ID with copy functionality',
};

export const TargetId: Story = () => (
  <div className="p-4">
    <ResourceDetails id="target_xyz789abc123def456" label="Target ID" />
  </div>
);

TargetId.meta = {
  description: 'Resource details for target ID',
};

export const OrganizationId: Story = () => (
  <div className="p-4">
    <ResourceDetails id="org_123456789abcdefghijkl" label="Organization ID" />
  </div>
);

OrganizationId.meta = {
  description: 'Resource details for organization ID',
};

export const InSettingsPage: Story = () => (
  <div className="p-6 max-w-2xl space-y-6">
    <div>
      <h3 className="text-neutral-12 font-semibold mb-4">Resource Identifiers</h3>
      <div className="space-y-3">
        <ResourceDetails id="org_abc123def456" label="Organization ID" />
        <ResourceDetails id="project_def456ghi789" label="Project ID" />
        <ResourceDetails id="target_ghi789jkl012" label="Target ID" />
      </div>
    </div>
    <p className="text-neutral-11 text-sm">
      Use these UUIDs in API calls or CLI commands instead of passing the full resource path.
    </p>
  </div>
);

InSettingsPage.meta = {
  description: 'Common pattern in settings pages showing multiple resource IDs',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">ResourceDetails Component</h2>
      <p className="text-neutral-11 mb-4">
        Displays resource identifiers (UUIDs) with a label, copy functionality, and info tooltip.
        Used on settings pages to show organization, project, and target IDs.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Structure</p>
          <ResourceDetails id="resource_abc123def456ghi789jkl012" label="Resource ID" />
          <p className="text-xs text-neutral-10">
            Combines three elements in a flex layout:
            <br />
            1. Label box: <code className="text-neutral-12">
              bg-neutral-2 border-neutral-5 text-neutral-10
            </code>
            <br />
            2. InputCopy: With <code className="text-neutral-12">rounded-l-none</code> to connect
            to label
            <br />
            3. Info icon tooltip: Explains UUID usage in API/CLI
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Label Box</p>
          <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 whitespace-nowrap rounded-md rounded-r-none border-y border-l px-3 py-2 text-sm w-fit">
            Example Label
          </div>
          <p className="text-xs text-neutral-10">
            Fixed height: <code className="text-neutral-12">h-10</code>
            <br />
            Borders: <code className="text-neutral-12">border-y border-l</code> (no right border)
            <br />
            Rounded: <code className="text-neutral-12">rounded-l-none</code> on right side
            <br />
            No wrap: <code className="text-neutral-12">whitespace-nowrap</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Multiple Resources</p>
          <div className="space-y-3">
            <ResourceDetails id="org_abc123" label="Organization" />
            <ResourceDetails id="project_def456" label="Project" />
            <ResourceDetails id="target_ghi789" label="Target" />
          </div>
          <p className="text-xs text-neutral-10">Common pattern: stack multiple ResourceDetails with spacing</p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">id</code>: string (required) - The UUID to display
            and copy
          </li>
          <li>
            <code className="text-neutral-12">label</code>: string (required) - Label text (e.g.,
            "Project ID")
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Tooltip Content</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10">
          "This UUID can be used in API calls or CLI commands to Hive instead of passing the full
          resource path. I.e. 'org/project/target'."
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Settings Pages</p>
          <p className="text-neutral-10 text-xs">
            Display organization, project, and target UUIDs on their respective settings pages.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Developer Tools</p>
          <p className="text-neutral-10 text-xs">
            Provide UUIDs for developers to use in API calls instead of full paths.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">CLI Integration</p>
          <p className="text-neutral-10 text-xs">
            Allow users to copy UUIDs for Hive CLI commands.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Implementation Details</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            Container: <code className="text-neutral-12">flex items-center</code>
          </li>
          <li>
            Label connects to InputCopy via <code className="text-neutral-12">rounded-r-none</code>{' '}
            and <code className="text-neutral-12">rounded-l-none</code>
          </li>
          <li>
            Tooltip has <code className="text-neutral-12">delayDuration={0}</code> for instant
            display
          </li>
          <li>
            Info icon: <code className="text-neutral-12">InfoCircledIcon size-4 ml-2</code>
          </li>
          <li>
            Tooltip content has <code className="text-neutral-12">max-w-sm text-pretty</code> for
            readability
          </li>
        </ul>
      </div>
    </div>
  </div>
);
