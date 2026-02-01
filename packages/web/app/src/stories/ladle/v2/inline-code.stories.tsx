import { InlineCode } from '@/components/v2/inline-code';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Inline Code',
};

export const Default: Story = () => <InlineCode content="npm install @graphql-hive/client" />;

export const APIKey: Story = () => (
  <div className="space-y-3">
    <div className="text-sm">Your API key:</div>
    <InlineCode content="hive_1234567890abcdef" />
  </div>
);

export const GitCommands: Story = () => (
  <div className="space-y-3">
    <div className="text-sm font-medium">Git commands:</div>
    <InlineCode content="git clone https://github.com/user/repo.git" />
    <InlineCode content="git add ." />
    <InlineCode content="git commit -m 'Initial commit'" />
    <InlineCode content="git push origin main" />
  </div>
);

export const LongContent: Story = () => (
  <div className="max-w-md">
    <div className="mb-2 text-sm">Long command:</div>
    <InlineCode content="npm install --save-dev @graphql-hive/client @graphql-hive/core @graphql-hive/schema" />
  </div>
);

export const InParagraph: Story = () => (
  <div className="max-w-lg space-y-4">
    <p className="text-sm">
      To install the Hive client, run <InlineCode content="npm install @graphql-hive/client" /> in
      your terminal.
    </p>
    <p className="text-sm">
      Then import it in your code with{' '}
      <InlineCode content="import { HiveClient } from '@graphql-hive/client'" />.
    </p>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Inline Code Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Inline code block with copy-to-clipboard functionality. Displays code snippets with
        monospace font and includes a copy button with click-to-copy behavior.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <InlineCode content="example" />
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Code block background</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <InlineCode content="code text" />
          <code className="text-xs">text-sm font-mono</code>
          <span className="text-neutral-11 text-xs">- Default code text (inherits color)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-neutral-5 flex items-center gap-2 rounded-md py-1">
            <code className="grow px-3 text-sm">hover</code>
            <button className="cursor-pointer p-2 hover:text-orange-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect width="10" height="10" x="3" y="3" rx="1" />
              </svg>
            </button>
          </div>
          <code className="text-xs">hover:text-orange</code>
          <span className="text-neutral-11 text-xs">- Copy button hover</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <InlineCode content="layout" />
          <code className="text-xs">flex items-center gap-2</code>
          <span className="text-neutral-11 text-xs">- Horizontal layout</span>
        </div>
        <div className="flex items-center gap-3">
          <InlineCode content="breaks" />
          <code className="text-xs">break-all</code>
          <span className="text-neutral-11 text-xs">- Long text wrapping</span>
        </div>
        <div className="flex items-center gap-3">
          <InlineCode content="grows" />
          <code className="text-xs">grow px-3</code>
          <span className="text-neutral-11 text-xs">- Code element flex grow</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interactive Behavior</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <InlineCode content="click to copy" />
          <code className="text-xs">onClick</code>
          <span className="text-neutral-11 text-xs">- Copies content to clipboard</span>
        </div>
        <div className="flex items-center gap-3">
          <InlineCode content="notification" />
          <code className="text-xs">useNotifications()</code>
          <span className="text-neutral-11 text-xs">- Shows "Copied to clipboard" toast</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="cursor-pointer p-2 hover:text-orange-500" title="Copy to clipboard">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect width="10" height="10" x="3" y="3" rx="1" />
            </svg>
          </button>
          <code className="text-xs">cursor-pointer</code>
          <span className="text-neutral-11 text-xs">- Copy button cursor</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Typography</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <InlineCode content="mono" />
          <code className="text-xs">font-mono</code>
          <span className="text-neutral-11 text-xs">- Monospace font family</span>
        </div>
        <div className="flex items-center gap-3">
          <InlineCode content="size" />
          <code className="text-xs">text-sm</code>
          <span className="text-neutral-11 text-xs">- Font size</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">API keys and tokens:</p>
          <InlineCode content="sk_live_1234567890abcdef" />
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Command line:</p>
          <InlineCode content="npm run dev" />
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">File paths:</p>
          <InlineCode content="/src/components/ui/button.tsx" />
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Environment variables:</p>
          <InlineCode content="NEXT_PUBLIC_API_URL=https://api.example.com" />
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses native navigator.clipboard.writeText() API</li>
        <li>CopyIcon component from ../ui/icon (size 16)</li>
        <li>useNotifications hook for success toast</li>
        <li>Prevents default on click event</li>
        <li>Accessible title attribute on copy button</li>
        <li>Content prop accepts any string</li>
        <li>Automatically handles long content with break-all</li>
      </ul>
    </div>
  </div>
);
