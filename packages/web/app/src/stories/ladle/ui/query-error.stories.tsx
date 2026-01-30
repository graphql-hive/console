import { CombinedError } from 'urql';
import { QueryError } from '@/components/ui/query-error';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Query Error',
};

// Mock error without request ID
const mockErrorBasic = new CombinedError({
  graphQLErrors: [{ message: 'Failed to load data. Please try again.' }],
});

// Mock error with request ID
const mockErrorWithRequestId = new CombinedError({
  graphQLErrors: [{ message: 'An unexpected error occurred.' }],
  response: {
    headers: new Headers({ 'x-request-id': 'req_abc123xyz789' }),
  } as Response,
});

// Mock network error
const mockNetworkError = new CombinedError({
  networkError: new Error('Network request failed'),
});

// Mock unexpected error
const mockUnexpectedError = new CombinedError({
  graphQLErrors: [{ message: 'Unexpected error: Something went wrong' }],
});

export const BasicError: Story = () => (
  <div className="h-[500px]">
    <QueryError error={mockErrorBasic} organizationSlug="my-org" />
  </div>
);

BasicError.meta = {
  description: 'Basic GraphQL error with sign out button',
};

export const WithRequestId: Story = () => (
  <div className="h-[500px]">
    <QueryError error={mockErrorWithRequestId} organizationSlug="my-org" />
  </div>
);

WithRequestId.meta = {
  description: 'Error with request ID for support tracking',
};

export const NetworkError: Story = () => (
  <div className="h-[500px]">
    <QueryError error={mockNetworkError} organizationSlug="my-org" />
  </div>
);

NetworkError.meta = {
  description: 'Network error showing generic message with support link',
};

export const WithoutLogoutButton: Story = () => (
  <div className="h-[500px]">
    <QueryError error={mockErrorBasic} organizationSlug="my-org" showLogoutButton={false} />
  </div>
);

WithoutLogoutButton.meta = {
  description: 'Error without sign out button',
};

export const WithoutOrganization: Story = () => (
  <div className="h-[500px]">
    <QueryError error={mockUnexpectedError} organizationSlug={null} />
  </div>
);

WithoutOrganization.meta = {
  description: 'Error without organization context, shows email support link',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">QueryError Component</h2>
      <p className="text-neutral-11 mb-4">
        Error display component for GraphQL query failures. Shows error illustration, message,
        optional sign out button, and request ID for support tracking.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Error with Request ID</p>
          <div className="border-neutral-6 h-[400px] overflow-hidden rounded-lg border">
            <QueryError error={mockErrorWithRequestId} organizationSlug="my-org" />
          </div>
          <p className="text-neutral-10 text-xs">
            Shows request ID in yellow badge for support tracking
            <br />
            Sign out button positioned at top-right:{' '}
            <code className="text-neutral-12">absolute right-6 top-6</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Network Error</p>
          <div className="border-neutral-6 h-[400px] overflow-hidden rounded-lg border">
            <QueryError error={mockNetworkError} organizationSlug="my-org" />
          </div>
          <p className="text-neutral-10 text-xs">
            Shows generic error message with support link when network error or unexpected error
            occurs
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Without Organization</p>
          <div className="border-neutral-6 h-[400px] overflow-hidden rounded-lg border">
            <QueryError error={mockUnexpectedError} organizationSlug={null} />
          </div>
          <p className="text-neutral-10 text-xs">
            When no organization context, shows email link instead of support page link
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">error</code>: CombinedError (required) - urql error
            object
          </li>
          <li>
            <code className="text-neutral-12">organizationSlug</code>: string | null (required) -
            For support page link
          </li>
          <li>
            <code className="text-neutral-12">showLogoutButton</code>: boolean (optional, default
            true) - Show sign out button
          </li>
          <li>
            <code className="text-neutral-12">showError</code>: boolean (optional) - Override error
            display logic
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Error Display Logic</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">Expected Errors:</strong> Shows specific GraphQL
            error message
          </li>
          <li>
            <strong className="text-neutral-12">Network Errors:</strong> Shows generic "something
            went wrong" message
          </li>
          <li>
            <strong className="text-neutral-12">Unexpected Errors:</strong> Shows generic message
            with support link
          </li>
          <li>
            <strong className="text-neutral-12">Request ID:</strong> Extracted from x-request-id
            header if available
          </li>
          <li>
            Component removes <code className="text-neutral-12">LAST_VISITED_ORG_KEY</code> cookie
            on render
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Visual Elements</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            Image: <code className="text-neutral-12">/images/figures/connection.svg</code>{' '}
            (200x200px)
          </li>
          <li>
            Layout:{' '}
            <code className="text-neutral-12">flex size-full items-center justify-center</code>
          </li>
          <li>
            Content:{' '}
            <code className="text-neutral-12">max-w-[960px] flex-col sm:flex-row items-center</code>
          </li>
          <li>
            Sign out button: <code className="text-neutral-12">absolute right-6 top-6</code>
          </li>
          <li>
            Request ID badge:{' '}
            <code className="text-neutral-12">bg-yellow-500/10 and bg-yellow-500/5</code>
          </li>
          <li>
            Support link:{' '}
            <code className="text-neutral-12">Button variant="link" text-neutral-2</code>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Query Errors</p>
          <p className="text-neutral-10 text-xs">
            Display GraphQL query errors throughout the app (target.tsx, organization-settings.tsx,
            etc.).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Network Failures</p>
          <p className="text-neutral-10 text-xs">
            Handle network errors with user-friendly message and support contact.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Authentication Errors</p>
          <p className="text-neutral-10 text-xs">
            Shows sign out button by default to allow users to re-authenticate.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Support Integration</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">With Organization:</strong> Links to{' '}
            <code className="text-neutral-12">/$organizationSlug/view/support</code>
          </li>
          <li>
            <strong className="text-neutral-12">Without Organization:</strong> Links to{' '}
            <code className="text-neutral-12">support@graphql-hive.com</code>
          </li>
          <li>
            <strong className="text-neutral-12">Request ID:</strong> Displayed in yellow badge for
            users to reference in support tickets
          </li>
          <li>
            Uses <code className="text-neutral-12">commonErrorStrings</code> for consistent
            messaging
          </li>
        </ul>
      </div>
    </div>
  </div>
);
