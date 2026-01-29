import type { Story } from '@ladle/react';
import { Code } from '@/components/ui/code';

export const Default: Story = () => <Code>npm install @graphql-hive/client</Code>;

export const MultiLine: Story = () => (
  <Code>
    {`{
  "name": "@graphql-hive/client",
  "version": "0.31.0",
  "description": "GraphQL Hive Client"
}`}
  </Code>
);

export const GraphQLQuery: Story = () => (
  <Code>
    {`query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    profile {
      avatar
      bio
    }
  }
}`}
  </Code>
);

export const CommandExample: Story = () => (
  <div className="space-y-4 max-w-2xl">
    <div>
      <p className="text-neutral-11 text-sm mb-2">Install the CLI:</p>
      <Code>npm install -g @graphql-hive/cli</Code>
    </div>
    <div>
      <p className="text-neutral-11 text-sm mb-2">Push your schema:</p>
      <Code>hive schema:publish --registry.accessToken YOUR_TOKEN schema.graphql</Code>
    </div>
  </div>
);

export const APIKeys: Story = () => (
  <div className="space-y-4 max-w-2xl">
    <div>
      <p className="text-neutral-11 text-sm mb-2">Access Token:</p>
      <Code>hive_1234567890abcdef1234567890abcdef</Code>
    </div>
    <div>
      <p className="text-neutral-11 text-sm mb-2">API Endpoint:</p>
      <Code>https://api.graphql-hive.com/graphql</Code>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Code Component</h2>
      <p className="text-neutral-11 mb-4">
        Code block with built-in copy-to-clipboard functionality. Shows copy button on hover.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Code Block</p>
          <Code>npm install @graphql-hive/client</Code>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-neutral-1</code>
            <br />
            Border: <code className="text-neutral-12">border-gray-600</code>
            <br />
            Font: <code className="text-neutral-12">font-mono text-sm</code>
            <br />
            Padding: <code className="text-neutral-12">p-4 pr-14</code> (extra padding for copy
            button)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Copy Button</p>
          <Code>hover over me to see the copy button</Code>
          <p className="text-xs text-neutral-10">
            Position: <code className="text-neutral-12">absolute right-3 top-2</code>
            <br />
            Visibility: <code className="text-neutral-12">opacity-0</code> until hover/copied
            <br />
            Icon changes: CopyIcon → CheckIcon when copied
            <br />
            Copied state lasts: 1500ms
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Multi-line Code</p>
          <Code>
            {`{
  "key": "value",
  "array": [1, 2, 3]
}`}
          </Code>
          <p className="text-xs text-neutral-10">
            Whitespace: <code className="text-neutral-12">whitespace-pre-line</code>
            <br />
            Break: <code className="text-neutral-12">break-all</code>
            <br />
            Direction: <code className="text-neutral-12">dir="ltr"</code> (always left-to-right)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Focus Behavior</p>
          <div className="space-y-2">
            <p className="text-xs text-neutral-10">Click or tab to focus the code block below:</p>
            <Code>focusable code block - try clicking or tabbing to it</Code>
            <p className="text-xs text-neutral-10">
              When focused, the entire code content is automatically selected
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Features</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Copy to Clipboard</p>
          <p className="text-neutral-10 text-xs">
            Hover to reveal copy button. Click to copy content to clipboard. Button shows checkmark
            for 1.5 seconds after copying.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Keyboard Accessible</p>
          <p className="text-neutral-10 text-xs">
            Code block is focusable via keyboard (tabIndex=0). When focused, all content is
            automatically selected for easy copying.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Monospace Font</p>
          <p className="text-neutral-10 text-xs">
            Uses font-mono for consistent character width, ideal for code, tokens, and technical
            content.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">CLI Commands</p>
          <p className="text-neutral-10 text-xs mb-2">Installation and usage commands</p>
          <Code>hive schema:publish schema.graphql</Code>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">API Tokens</p>
          <p className="text-neutral-10 text-xs mb-2">Access tokens and API keys</p>
          <Code>hive_abc123def456ghi789</Code>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">GraphQL Queries</p>
          <p className="text-neutral-10 text-xs mb-2">Schema definitions and operations</p>
          <Code>{`query { user { id name } }`}</Code>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Configuration</p>
          <p className="text-neutral-10 text-xs mb-2">JSON, YAML, or other config snippets</p>
          <Code>{`{ "endpoint": "https://api.example.com" }`}</Code>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Implementation Details</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>Uses useHover hook to detect hover state</li>
          <li>Uses useTimed hook for temporary "copied" state</li>
          <li>Checks navigator.clipboard.writeText support</li>
          <li>Auto-selects text on focus using Selection API</li>
          <li>Copy button hidden if clipboard API not supported</li>
        </ul>
      </div>
    </div>
  </div>
);
