import type { Story } from '@ladle/react';
import { CopyText } from '@/components/ui/copy-text';

export const CommitHash: Story = () => (
  <div className="p-4 max-w-md">
    <div className="text-neutral-11 text-sm mb-2">Commit</div>
    <div className="text-neutral-12 font-mono text-sm" title="abc123def456">
      <CopyText>abc123def456</CopyText>
    </div>
  </div>
);

CommitHash.meta = {
  description: 'Commit hash with copy button, based on target-checks-single.tsx usage',
};

export const LongText: Story = () => (
  <div className="p-4 max-w-md">
    <div className="text-neutral-11 text-sm mb-2">API Key</div>
    <div className="text-neutral-12 font-mono text-sm">
      <CopyText>hive_api_key_1234567890abcdefghijklmnopqrstuvwxyz</CopyText>
    </div>
  </div>
);

LongText.meta = {
  description: 'Long text that truncates with copy functionality',
};

export const CustomCopyValue: Story = () => (
  <div className="p-4 max-w-md">
    <div className="text-neutral-11 text-sm mb-2">Installation</div>
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
        <tr className="border-b border-neutral-6">
          <th className="text-left text-neutral-11 text-sm font-medium pb-2">Version</th>
          <th className="text-left text-neutral-11 text-sm font-medium pb-2">Commit</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-neutral-6">
          <td className="text-neutral-12 py-2">v1.0.0</td>
          <td className="text-neutral-12 font-mono text-sm py-2">
            <CopyText>a1b2c3d4e5f6</CopyText>
          </td>
        </tr>
        <tr className="border-b border-neutral-6">
          <td className="text-neutral-12 py-2">v1.0.1</td>
          <td className="text-neutral-12 font-mono text-sm py-2">
            <CopyText>f6e5d4c3b2a1</CopyText>
          </td>
        </tr>
        <tr>
          <td className="text-neutral-12 py-2">v1.1.0</td>
          <td className="text-neutral-12 font-mono text-sm py-2">
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
  <div className="p-4 space-y-3 max-w-2xl">
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 text-sm w-24 shrink-0">Schema ID</div>
      <div className="text-neutral-12 font-mono text-sm flex-1">
        <CopyText>schema_abc123</CopyText>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 text-sm w-24 shrink-0">Target ID</div>
      <div className="text-neutral-12 font-mono text-sm flex-1">
        <CopyText>target_def456</CopyText>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="text-neutral-11 text-sm w-24 shrink-0">Project ID</div>
      <div className="text-neutral-12 font-mono text-sm flex-1">
        <CopyText>project_ghi789</CopyText>
      </div>
    </div>
  </div>
);

MultipleInList.meta = {
  description: 'Multiple CopyText components in a detail list',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">CopyText Component</h2>
      <p className="text-neutral-11 mb-4">
        Text wrapper with a copy button that appears on hover. Commonly used for commit hashes,
        API keys, and other copyable identifiers.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Usage</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="text-neutral-12 font-mono text-sm">
              <CopyText>abc123def456</CopyText>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Container: <code className="text-neutral-12">group flex items-center</code>
            <br />
            Text: <code className="text-neutral-12">truncate</code> (prevents overflow)
            <br />
            Button: <code className="text-neutral-12">
              invisible group-hover:visible
            </code>{' '}
            (shows on hover)
            <br />
            Icon: <code className="text-neutral-12">CopyIcon size 14px</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Long Text (Truncates)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6 max-w-md">
            <div className="text-neutral-12 font-mono text-sm">
              <CopyText>hive_api_key_1234567890abcdefghijklmnopqrstuvwxyz_very_long</CopyText>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Text automatically truncates with ellipsis when it exceeds container width
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Copy Value</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="text-neutral-12 text-sm">
              <CopyText copy="The actual copied text">
                <span>Displayed text (hover to copy something different)</span>
              </CopyText>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Use <code className="text-neutral-12">copy</code> prop to specify a different value
            to copy than what's displayed
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">In Context (Commit Hash)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-1">
              <div className="text-neutral-11 text-xs">Commit</div>
              <div className="text-neutral-12 font-mono text-sm" title="abc123def456">
                <CopyText>abc123def456</CopyText>
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Common pattern from target-checks-single.tsx and target-history-version.tsx
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">children</code>: ReactNode - Content to display
          </li>
          <li>
            <code className="text-neutral-12">copy</code>: string (optional) - Custom value to
            copy (defaults to innerText)
          </li>
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional
            CSS classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Behavior</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            Copy button is <code className="text-neutral-12">invisible</code> by default
          </li>
          <li>
            On hover, button becomes{' '}
            <code className="text-neutral-12">group-hover:visible</code>
          </li>
          <li>
            Uses <code className="text-neutral-12">useClipboard</code> hook for copying
          </li>
          <li>
            Tooltip shows "Copy" label with{' '}
            <code className="text-neutral-12">delayDuration={0}</code>
          </li>
          <li>
            Text content uses <code className="text-neutral-12">truncate</code> to prevent
            overflow
          </li>
          <li>
            If <code className="text-neutral-12">copy</code> prop not provided, copies the
            innerText of the content
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Git Commit Hashes</p>
          <p className="text-neutral-10 text-xs">
            Display commit hashes with quick copy functionality (target-checks-single.tsx,
            target-history-version.tsx).
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">API Keys & Tokens</p>
          <p className="text-neutral-10 text-xs">
            Show truncated tokens with copy button for easy clipboard access.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">IDs & Identifiers</p>
          <p className="text-neutral-10 text-xs">
            Display schema IDs, target IDs, project IDs, and other unique identifiers.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Command Snippets</p>
          <p className="text-neutral-10 text-xs">
            Show CLI commands or code snippets with easy copy functionality.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Styling Details</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
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
