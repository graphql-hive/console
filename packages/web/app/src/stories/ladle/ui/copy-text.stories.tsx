import { CopyText } from '@/components/ui/copy-text';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Copy Text',
};

export const CommitHash: Story = () => (
  <div className="max-w-md p-4">
    <div className="text-neutral-11 mb-2 text-sm">Commit</div>
    <div className="text-neutral-12 font-mono text-sm" title="abc123def456">
      <CopyText>abc123def456</CopyText>
    </div>
  </div>
);

CommitHash.meta = {
  description: 'Commit hash with copy button, based on target-checks-single.tsx usage',
};

export const LongText: Story = () => (
  <div className="max-w-md p-4">
    <div className="text-neutral-11 mb-2 text-sm">API Key</div>
    <div className="text-neutral-12 font-mono text-sm">
      <CopyText>hive_api_key_1234567890abcdefghijklmnopqrstuvwxyz</CopyText>
    </div>
  </div>
);

LongText.meta = {
  description: 'Long text that truncates with copy functionality',
};

export const CustomCopyValue: Story = () => (
  <div className="max-w-md p-4">
    <div className="text-neutral-11 mb-2 text-sm">Installation</div>
    <div className="text-neutral-12 text-sm">
      <CopyText copy="npm install @graphql-hive/client">
        <span className="font-mono">npm install @graphql-hive/client</span>
      </CopyText>
    </div>
  </div>
);

CustomCopyValue.meta = {
  description: 'Custom copy value different from displayed text',
};

export const InTable: Story = () => (
  <div className="p-4">
    <table className="w-full">
      <thead>
        <tr className="border-neutral-6 border-b">
          <th className="text-neutral-11 pb-2 text-left text-sm font-medium">Version</th>
          <th className="text-neutral-11 pb-2 text-left text-sm font-medium">Commit</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-neutral-6 border-b">
          <td className="text-neutral-12 py-2">v1.0.0</td>
          <td className="text-neutral-12 py-2 font-mono text-sm">
            <CopyText>a1b2c3d4e5f6</CopyText>
          </td>
        </tr>
        <tr className="border-neutral-6 border-b">
          <td className="text-neutral-12 py-2">v1.0.1</td>
          <td className="text-neutral-12 py-2 font-mono text-sm">
            <CopyText>f6e5d4c3b2a1</CopyText>
          </td>
        </tr>
        <tr>
          <td className="text-neutral-12 py-2">v1.1.0</td>
          <td className="text-neutral-12 py-2 font-mono text-sm">
            <CopyText>9z8y7x6w5v4u</CopyText>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

InTable.meta = {
  description: 'CopyText in table rows, showing hover behavior for each row',
};

export const MultipleInList: Story = () => (
  <div className="max-w-2xl space-y-3 p-4">
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 w-24 shrink-0 text-sm">Schema ID</div>
      <div className="text-neutral-12 flex-1 font-mono text-sm">
        <CopyText>schema_abc123</CopyText>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 w-24 shrink-0 text-sm">Target ID</div>
      <div className="text-neutral-12 flex-1 font-mono text-sm">
        <CopyText>target_def456</CopyText>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 w-24 shrink-0 text-sm">Project ID</div>
      <div className="text-neutral-12 flex-1 font-mono text-sm">
        <CopyText>project_ghi789</CopyText>
      </div>
    </div>
  </div>
);

MultipleInList.meta = {
  description: 'Multiple CopyText components in a detail list',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">CopyText Component</h2>
      <p className="text-neutral-11 mb-4">
        Text wrapper with a copy button that appears on hover. Commonly used for commit hashes, API
        keys, and other copyable identifiers.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Usage</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="text-neutral-12 font-mono text-sm">
              <CopyText>abc123def456</CopyText>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Container: <code className="text-neutral-12">group flex items-center</code>
            <br />
            Text: <code className="text-neutral-12">truncate</code> (prevents overflow)
            <br />
            Button: <code className="text-neutral-12">invisible group-hover:visible</code> (shows on
            hover)
            <br />
            Icon: <code className="text-neutral-12">CopyIcon size 14px</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Long Text (Truncates)</p>
          <div className="bg-neutral-1 border-neutral-6 max-w-md rounded-sm border p-4">
            <div className="text-neutral-12 font-mono text-sm">
              <CopyText>hive_api_key_1234567890abcdefghijklmnopqrstuvwxyz_very_long</CopyText>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Text automatically truncates with ellipsis when it exceeds container width
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Copy Value</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="text-neutral-12 text-sm">
              <CopyText copy="The actual copied text">
                <span>Displayed text (hover to copy something different)</span>
              </CopyText>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Use <code className="text-neutral-12">copy</code> prop to specify a different value to
            copy than what's displayed
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">In Context (Commit Hash)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="space-y-1">
              <div className="text-neutral-11 text-xs">Commit</div>
              <div className="text-neutral-12 font-mono text-sm" title="abc123def456">
                <CopyText>abc123def456</CopyText>
              </div>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Common pattern from target-checks-single.tsx and target-history-version.tsx
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">children</code>: ReactNode - Content to display
          </li>
          <li>
            <code className="text-neutral-12">copy</code>: string (optional) - Custom value to copy
            (defaults to innerText)
          </li>
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
            classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Behavior</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            Copy button is <code className="text-neutral-12">invisible</code> by default
          </li>
          <li>
            On hover, button becomes <code className="text-neutral-12">group-hover:visible</code>
          </li>
          <li>
            Uses <code className="text-neutral-12">useClipboard</code> hook for copying
          </li>
          <li>
            Tooltip shows "Copy" label with{' '}
            <code className="text-neutral-12">delayDuration={0}</code>
          </li>
          <li>
            Text content uses <code className="text-neutral-12">truncate</code> to prevent overflow
          </li>
          <li>
            If <code className="text-neutral-12">copy</code> prop not provided, copies the innerText
            of the content
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Git Commit Hashes</p>
          <p className="text-neutral-10 text-xs">
            Display commit hashes with quick copy functionality (target-checks-single.tsx,
            target-history-version.tsx).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">API Keys & Tokens</p>
          <p className="text-neutral-10 text-xs">
            Show truncated tokens with copy button for easy clipboard access.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">IDs & Identifiers</p>
          <p className="text-neutral-10 text-xs">
            Display schema IDs, target IDs, project IDs, and other unique identifiers.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Command Snippets</p>
          <p className="text-neutral-10 text-xs">
            Show CLI commands or code snippets with easy copy functionality.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Styling Details</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            Button variant: <code className="text-neutral-12">link</code>
          </li>
          <li>
            Button margins: <code className="text-neutral-12">-my-3 p-2 py-3</code> (compact)
          </li>
          <li>
            Icon size: <code className="text-neutral-12">14px</code>
          </li>
          <li>
            Layout: <code className="text-neutral-12">flex items-center</code> with group hover
            state
          </li>
          <li>Text container uses ref for innerText access when copy prop not provided</li>
        </ul>
      </div>
    </div>
  </div>
);
