import { Callout } from '@/components/ui/callout';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Callout',
};

export const Default: Story = () => (
  <Callout>This is a default callout message with important information.</Callout>
);

export const AllTypes: Story = () => (
  <div className="max-w-2xl space-y-4">
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
    <div className="rounded-sm border border-orange-600 bg-orange-300 p-3">
      <p className="text-xs text-orange-900">
        Warning: This action cannot be undone. You will lose admin access to this organization.
      </p>
    </div>
  </div>
);

export const WithCustomEmoji: Story = () => (
  <div className="max-w-2xl space-y-4">
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
        <ul className="list-inside list-disc space-y-1">
          <li>First important point</li>
          <li>Second important point</li>
          <li>Third important point</li>
        </ul>
      </div>
    </Callout>
  </div>
);

export const WithLinks: Story = () => (
  <div className="max-w-2xl space-y-4">
    <Callout type="info">
      Need help? Check out our{' '}
      <a href="#" className="font-medium underline">
        documentation
      </a>{' '}
      or{' '}
      <a href="#" className="font-medium underline">
        contact support
      </a>
      .
    </Callout>
    <Callout type="warning">
      This feature is deprecated.{' '}
      <a href="#" className="font-medium underline">
        Learn about the new approach
      </a>
      .
    </Callout>
  </div>
);
