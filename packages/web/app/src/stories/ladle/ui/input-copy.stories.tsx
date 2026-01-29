import { InputCopy } from '@/components/ui/input-copy';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Input Copy',
};

export const APIKey: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Access Token</label>
      <InputCopy value="hive_api_key_1234567890abcdefghijklmnopqrstuvwxyz" />
    </div>
  </div>
);

APIKey.meta = {
  description:
    'API key input with copy button, based on create-access-token-sheet-content.tsx usage',
};

export const Endpoint: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">GraphQL Endpoint</label>
      <InputCopy value="https://app.graphql-hive.com/graphql" />
    </div>
  </div>
);

Endpoint.meta = {
  description: 'Endpoint URL input with copy button, based on connect-lab-modal.tsx usage',
};

export const CDNUrl: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">CDN Supergraph URL</label>
      <InputCopy multiline value="https://cdn.graphql-hive.com/artifacts/v1/abc123/supergraph" />
    </div>
  </div>
);

CDNUrl.meta = {
  description: 'Multiline CDN URL input based on target.tsx layout',
};

export const CurlCommand: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Example cURL Command</label>
      <InputCopy
        multiline
        value={`curl -H 'X-Hive-CDN-Key: <hive_cdn_access_key>' \\
  https://cdn.graphql-hive.com/supergraph`}
      />
    </div>
  </div>
);

CurlCommand.meta = {
  description: 'Multiline cURL command input based on target.tsx layout',
};

export const ShortValue: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Project ID</label>
      <InputCopy value="project_abc123" />
    </div>
  </div>
);

ShortValue.meta = {
  description: 'Short value that fits comfortably in input',
};

export const LongValue: Story = () => (
  <div className="p-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">JWT Token</label>
      <InputCopy value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" />
    </div>
  </div>
);

LongValue.meta = {
  description: 'Long value that truncates in input',
};

export const CopyButtonStates: Story = () => (
  <div className="space-y-6 p-4">
    <div className="space-y-2">
      <p className="text-neutral-12 text-sm font-medium">Default State</p>
      <p className="text-neutral-10 mb-2 text-xs">Shows copy icon</p>
      <InputCopy value="Click the copy button to see the state change" />
    </div>
    <div className="space-y-2">
      <p className="text-neutral-12 text-sm font-medium">After Clicking</p>
      <p className="text-neutral-10 mb-2 text-xs">
        Shows checkmark in emerald-500 for 2 seconds after copying
      </p>
    </div>
  </div>
);

CopyButtonStates.meta = {
  description: 'Demonstrates copy button state transitions',
};

export const InForm: Story = () => (
  <div className="max-w-2xl p-4">
    <div className="bg-neutral-1 border-neutral-6 space-y-4 rounded-lg border p-6">
      <h3 className="text-neutral-12 text-lg font-semibold">Access Token Created</h3>
      <p className="text-neutral-11 text-sm">
        Your access token has been created. Copy it now as you won't be able to see it again.
      </p>
      <div className="space-y-2">
        <label className="text-neutral-12 text-sm font-medium">Token</label>
        <InputCopy value="hive_token_abc123def456ghi789jkl012mno345" />
      </div>
      <p className="text-neutral-10 text-xs">
        Store this token securely. It grants access to your GraphQL Hive project.
      </p>
    </div>
  </div>
);

InForm.meta = {
  description: 'InputCopy in a form context, common pattern in access token creation',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">InputCopy Component</h2>
      <p className="text-neutral-11 mb-4">
        Read-only input or textarea with a copy button. Displays text that users need to copy for
        use elsewhere, commonly for API keys, tokens, URLs, and CLI commands.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Single-line Input</p>
          <InputCopy value="https://app.graphql-hive.com/graphql" />
          <p className="text-neutral-10 text-xs">
            Element: <code className="text-neutral-12">Input</code> component
            <br />
            Styling: <code className="text-neutral-12">bg-secondary text-neutral-12 truncate</code>
            <br />
            Behavior: <code className="text-neutral-12">readOnly, onFocus selects all text</code>
            <br />
            Max width: <code className="text-neutral-12">max-w-2xl</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Multiline Textarea</p>
          <InputCopy
            multiline
            value={`curl -H 'X-Hive-CDN-Key: <key>' \\
  https://cdn.graphql-hive.com/supergraph`}
          />
          <p className="text-neutral-10 text-xs">
            Element: <code className="text-neutral-12">Textarea</code> component
            <br />
            Styling:{' '}
            <code className="text-neutral-12">
              bg-secondary text-neutral-12 resize-none font-mono text-xs
            </code>
            <br />
            Behavior:{' '}
            <code className="text-neutral-12">readOnly, autoSize, onFocus selects all text</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Copy Button</p>
          <InputCopy value="Click the copy button to see it change" />
          <p className="text-neutral-10 text-xs">
            Variant: <code className="text-neutral-12">outline</code>
            <br />
            Size: <code className="text-neutral-12">icon (size-10 shrink-0)</code>
            <br />
            Background: <code className="text-neutral-12">bg-secondary</code>
            <br />
            Default icon: <code className="text-neutral-12">CopyIcon (size-4)</code>
            <br />
            Copied icon:{' '}
            <code className="text-neutral-12">CheckIcon (size-4 text-emerald-500)</code>
            <br />
            Copied state duration: <code className="text-neutral-12">2 seconds</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">value</code>: string (required) - Text to display and
            copy
          </li>
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
            classes for input/textarea
          </li>
          <li>
            <code className="text-neutral-12">multiline</code>: boolean (optional) - Use Textarea
            instead of Input
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Behavior</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            Input/textarea is <code className="text-neutral-12">readOnly</code>
          </li>
          <li>
            On focus, automatically selects all text with{' '}
            <code className="text-neutral-12">ev.target.select()</code>
          </li>
          <li>
            Copy button uses <code className="text-neutral-12">useClipboard</code> hook
          </li>
          <li>
            After copying, button shows <code className="text-neutral-12">CheckIcon</code> in
            emerald-500
          </li>
          <li>
            Check icon reverts to copy icon after <code className="text-neutral-12">2 seconds</code>
          </li>
          <li>
            Multiline textarea has <code className="text-neutral-12">autoSize</code> prop
          </li>
          <li>Single-line input truncates long text with ellipsis</li>
          <li>
            Layout: <code className="text-neutral-12">flex items-center space-x-2</code>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Access Tokens & API Keys</p>
          <p className="text-neutral-10 text-xs">
            Display newly created access tokens for users to copy
            (create-access-token-sheet-content.tsx, create-project-access-token-sheet-content.tsx).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">GraphQL Endpoints</p>
          <p className="text-neutral-10 text-xs">
            Show GraphQL endpoint URLs that users can copy for their clients
            (connect-lab-modal.tsx).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">CDN URLs</p>
          <p className="text-neutral-10 text-xs">
            Display CDN URLs for schema access, often in multiline mode (target.tsx layout).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">CLI Commands</p>
          <p className="text-neutral-10 text-xs">
            Show cURL commands and other CLI snippets with multiline support (target.tsx layout).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Registry Tokens</p>
          <p className="text-neutral-10 text-xs">
            Display registry access tokens in target settings
            (target/settings/registry-access-token.tsx).
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Visual Feedback</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Copy Icon (Default)</p>
          <p className="text-neutral-10 text-xs">
            Lucide CopyIcon in default color, size-4. Indicates the content can be copied.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Check Icon (Copied)</p>
          <p className="text-neutral-10 text-xs">
            Lucide CheckIcon in emerald-500, size-4. Confirms successful copy for 2 seconds.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Text Selection</p>
          <p className="text-neutral-10 text-xs">
            Clicking/focusing the input automatically selects all text for easy manual copying.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation Details</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            Container:{' '}
            <code className="text-neutral-12">flex w-full max-w-2xl items-center space-x-2</code>
          </li>
          <li>
            Input container: <code className="text-neutral-12">relative grow</code>
          </li>
          <li>
            Button alignment: <code className="text-neutral-12">self-baseline</code> (aligns with
            first line of textarea)
          </li>
          <li>
            Uses <code className="text-neutral-12">useState</code> for isCopied state
          </li>
          <li>
            Uses <code className="text-neutral-12">useEffect</code> to reset copied state after 2s
          </li>
          <li>
            Uses <code className="text-neutral-12">useCallback</code> for handleClick optimization
          </li>
          <li>Screen reader text: "Copy" / "Copied" via sr-only span</li>
        </ul>
      </div>
    </div>
  </div>
);
