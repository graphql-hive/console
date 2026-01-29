import type { Story } from '@ladle/react';
import { Callout } from '@/components/ui/callout';

export const Default: Story = () => (
  <Callout>This is a default callout message with important information.</Callout>
);

export const AllTypes: Story = () => (
  <div className="space-y-4 max-w-2xl">
    <Callout type="default">
      This is a default callout. Use it for general announcements or tips.
    </Callout>
    <Callout type="info">
      This is an info callout. Use it to provide additional helpful information.
    </Callout>
    <Callout type="warning">
      This is a warning callout. Use it to alert users about potential issues.
    </Callout>
    <Callout type="error">
      This is an error callout. Use it to display error messages or critical warnings.
    </Callout>
  </div>
);

export const WithCustomEmoji: Story = () => (
  <div className="space-y-4 max-w-2xl">
    <Callout emoji="🎉">Congratulations! You've completed the setup process.</Callout>
    <Callout type="info" emoji="📝">
      Don't forget to save your changes before navigating away.
    </Callout>
    <Callout type="warning" emoji="⚠️">
      This action cannot be undone. Please proceed with caution.
    </Callout>
  </div>
);

export const WithLongContent: Story = () => (
  <div className="max-w-2xl">
    <Callout type="info">
      <div className="space-y-2">
        <p className="font-semibold">Important Information</p>
        <p>
          This callout contains longer content to demonstrate how the component handles multiple
          paragraphs and more detailed information. The content will wrap naturally and maintain
          proper spacing.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>First important point</li>
          <li>Second important point</li>
          <li>Third important point</li>
        </ul>
      </div>
    </Callout>
  </div>
);

export const WithLinks: Story = () => (
  <div className="space-y-4 max-w-2xl">
    <Callout type="info">
      Need help? Check out our{' '}
      <a href="#" className="underline font-medium">
        documentation
      </a>{' '}
      or{' '}
      <a href="#" className="underline font-medium">
        contact support
      </a>
      .
    </Callout>
    <Callout type="warning">
      This feature is deprecated.{' '}
      <a href="#" className="underline font-medium">
        Learn about the new approach
      </a>
      .
    </Callout>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Callout Types</h2>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default (Orange)</p>
          <Callout type="default">This is a default callout with orange styling.</Callout>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-orange-100</code>
            <br />
            Background: <code className="text-neutral-12">bg-orange-50</code>
            <br />
            Text: <code className="text-neutral-12">text-orange-800</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Info (Blue)</p>
          <Callout type="info">This is an info callout with blue styling.</Callout>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-blue-200</code>
            <br />
            Background: <code className="text-neutral-12">bg-blue-100</code>
            <br />
            Text: <code className="text-neutral-12">text-blue-900</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Warning (Yellow)</p>
          <Callout type="warning">This is a warning callout with yellow styling.</Callout>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-yellow-100</code>
            <br />
            Background: <code className="text-neutral-12">bg-yellow-50</code>
            <br />
            Text: <code className="text-neutral-12">text-yellow-900</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Error (Red)</p>
          <Callout type="error">This is an error callout with red styling.</Callout>
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-red-200</code>
            <br />
            Background: <code className="text-neutral-12">bg-red-100</code>
            <br />
            Text: <code className="text-neutral-12">text-red-900</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Layout</p>
          <Callout type="info">
            <span className="font-mono text-sm">Icon + Content</span> layout with flexbox
          </Callout>
          <p className="text-xs text-neutral-10">
            Container: <code className="text-neutral-12">flex items-center gap-4</code>
            <br />
            Padding: <code className="text-neutral-12">px-4 py-2</code>
            <br />
            Border radius: <code className="text-neutral-12">rounded-lg</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Custom Emoji</p>
          <Callout emoji="🎨">
            You can override the default icon with a custom emoji or React element.
          </Callout>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Rich Content</p>
          <Callout type="warning">
            <div className="space-y-2">
              <p className="font-semibold">Multiple Paragraphs</p>
              <p>
                Callouts support rich content including multiple paragraphs, lists, and inline
                formatting.
              </p>
            </div>
          </Callout>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Examples</h2>
      <div className="space-y-4">
        <Callout type="default">
          <strong>Pro Tip:</strong> Use keyboard shortcuts to navigate faster through the interface.
        </Callout>

        <Callout type="info">
          Your changes have been saved automatically. You can continue editing or{' '}
          <a href="#" className="underline font-medium">
            publish now
          </a>
          .
        </Callout>

        <Callout type="warning">
          This operation will affect all team members. Make sure to notify them before proceeding.
        </Callout>

        <Callout type="error">
          Failed to connect to the server. Please check your internet connection and try again.
        </Callout>
      </div>
    </div>
  </div>
);
