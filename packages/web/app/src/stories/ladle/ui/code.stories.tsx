import { Code } from '@/components/ui/code';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Code',
};

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
  <div className="max-w-2xl space-y-4">
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Install the CLI:</p>
      <Code>npm install -g @graphql-hive/cli</Code>
    </div>
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Push your schema:</p>
      <Code>hive schema:publish --registry.accessToken YOUR_TOKEN schema.graphql</Code>
    </div>
  </div>
);

export const APIKeys: Story = () => (
  <div className="max-w-2xl space-y-4">
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Access Token:</p>
      <Code>hive_1234567890abcdef1234567890abcdef</Code>
    </div>
    <div>
      <p className="text-neutral-11 mb-2 text-sm">API Endpoint:</p>
      <Code>https://api.graphql-hive.com/graphql</Code>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Code Component</h2>
      <p className="text-neutral-11 mb-4">
        Code block with built-in copy-to-clipboard functionality. Shows copy button on hover.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Code Block</p>
          <Code>npm install @graphql-hive/client</Code>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-1</code>
            <br />
            Border: <code className="text-neutral-12">border-neutral-8</code>
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
          <p className="text-neutral-10 text-xs">
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
          <p className="text-neutral-10 text-xs">
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
            <p className="text-neutral-10 text-xs">Click or tab to focus the code block below:</p>
            <Code>focusable code block - try clicking or tabbing to it</Code>
            <p className="text-neutral-10 text-xs">
              When focused, the entire code content is automatically selected
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Features</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Copy to Clipboard</p>
          <p className="text-neutral-10 text-xs">
            Hover to reveal copy button. Click to copy content to clipboard. Button shows checkmark
            for 1.5 seconds after copying.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Keyboard Accessible</p>
          <p className="text-neutral-10 text-xs">
            Code block is focusable via keyboard (tabIndex=0). When focused, all content is
            automatically selected for easy copying.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Monospace Font</p>
          <p className="text-neutral-10 text-xs">
            Uses font-mono for consistent character width, ideal for code, tokens, and technical
            content.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">CLI Commands</p>
          <p className="text-neutral-10 mb-2 text-xs">Installation and usage commands</p>
          <Code>hive schema:publish schema.graphql</Code>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">API Tokens</p>
          <p className="text-neutral-10 mb-2 text-xs">Access tokens and API keys</p>
          <Code>hive_abc123def456ghi789</Code>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">GraphQL Queries</p>
          <p className="text-neutral-10 mb-2 text-xs">Schema definitions and operations</p>
          <Code>{`query { user { id name } }`}</Code>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Configuration</p>
          <p className="text-neutral-10 mb-2 text-xs">JSON, YAML, or other config snippets</p>
          <Code>{`{ "endpoint": "https://api.example.com" }`}</Code>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation Details</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
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
