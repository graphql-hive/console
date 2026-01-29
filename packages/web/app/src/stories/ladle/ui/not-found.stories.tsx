import { NotFound } from '@/components/ui/not-found';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Not Found',
};

export const SupportTicket: Story = () => (
  <div className="py-6">
    <NotFound
      title="Support ticket not found."
      description="The support ticket you are looking for does not exist or you do not have access to it."
    />
  </div>
);

export const PageNotFound: Story = () => (
  <div className="py-6">
    <NotFound title="Page not found" description="The page you're looking for doesn't exist." />
  </div>
);

export const ResourceNotFound: Story = () => (
  <div className="py-6">
    <NotFound
      title="Project not found"
      description="The project you are looking for does not exist or has been deleted."
    />
  </div>
);

export const AccessDenied: Story = () => (
  <div className="py-6">
    <NotFound
      title="Access denied"
      description="You don't have permission to view this resource. Contact your organization admin for access."
    />
  </div>
);

export const OrganizationNotFound: Story = () => (
  <div className="py-6">
    <NotFound
      title="Organization not found"
      description="The organization you are trying to access does not exist or you don't have access to it."
    />
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">NotFound Component</h2>
      <p className="text-neutral-11 mb-4">
        404-style error state component for displaying when a resource is not found. Shows a ghost
        illustration with title and description, commonly used for missing or inaccessible
        resources.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Usage</p>
          <NotFound
            title="Resource not found"
            description="The item you're looking for doesn't exist"
          />
          <p className="text-neutral-10 text-xs">
            Container: <code className="text-neutral-12">Card (v2) component</code>
            <br />
            Image: <code className="text-neutral-12">ghost.svg (200x200px)</code>
            <br />
            Title: <code className="text-neutral-12">Heading component (text-neutral-12)</code>
            <br />
            Description:{' '}
            <code className="text-neutral-12">text-neutral-10 text-sm font-medium</code>
            <br />
            Layout: <code className="text-neutral-12">flex-col items-center gap-y-2</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Support Ticket Not Found</p>
          <NotFound
            title="Support ticket not found."
            description="The support ticket you are looking for does not exist or you do not have access to it."
          />
          <p className="text-neutral-10 text-xs">Real usage from organization-support-ticket.tsx</p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Access Denied Variant</p>
          <NotFound
            title="Access denied"
            description="You don't have permission to view this resource."
          />
          <p className="text-neutral-10 text-xs">
            Can also be used for permission/access errors, not just missing resources
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">title</code>: string (required) - Error title
          </li>
          <li>
            <code className="text-neutral-12">description</code>: string (required) - Error
            description
          </li>
          <li>
            <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
            classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Comparison: NotFound vs EmptyList</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">NotFound Component</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              Image: <code className="text-neutral-12">ghost.svg</code>
            </li>
            <li>
              Use case: <code className="text-neutral-12">404 errors, missing resources</code>
            </li>
            <li>
              Card: <code className="text-neutral-12">v2/Card</code> component
            </li>
            <li>No children prop or docsUrl support</li>
            <li>Test attribute: data-cy="empty-list" (same as EmptyList)</li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">EmptyList Component</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              Image: <code className="text-neutral-12">magnifier.svg</code>
            </li>
            <li>
              Use case: <code className="text-neutral-12">Empty states, no data</code>
            </li>
            <li>
              Card: <code className="text-neutral-12">ui/Card</code> component
            </li>
            <li>Supports children prop and docsUrl</li>
            <li>Has min-h-[400px] constraint</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Missing Resources</p>
          <p className="text-neutral-10 text-xs">
            Show when a specific resource (support ticket, project, target, etc.) cannot be found or
            accessed (organization-support-ticket.tsx).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">404 Pages</p>
          <p className="text-neutral-10 text-xs">
            Display on routes that don't match any known paths.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Access Denied</p>
          <p className="text-neutral-10 text-xs">
            Show when a user lacks permissions to view a resource they're trying to access.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Deleted Resources</p>
          <p className="text-neutral-10 text-xs">
            Display when accessing a resource that has been deleted.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Visual Elements</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>
            Image: <code className="text-neutral-12">ghost.svg</code> (200x200px)
          </li>
          <li>
            Layout: <code className="text-neutral-12">Card (v2)</code> with centered flexbox
          </li>
          <li>
            Title styling: <code className="text-neutral-12">Heading component, text-center</code>
          </li>
          <li>
            Description styling:{' '}
            <code className="text-neutral-12">text-neutral-10 text-center text-sm font-medium</code>
          </li>
          <li>
            Gap: <code className="text-neutral-12">gap-y-2</code> between elements
          </li>
          <li>
            Card grows to fill container:{' '}
            <code className="text-neutral-12">flex grow cursor-default</code>
          </li>
          <li>Test attribute: data-cy="empty-list"</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">When to Use</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Use NotFound When:</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>A specific resource cannot be found (404 scenario)</li>
            <li>User lacks access to an existing resource (403/permission error)</li>
            <li>A resource has been deleted or no longer exists</li>
            <li>Invalid URL or route parameters</li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Use EmptyList When:</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>A list/collection is empty but valid (no data yet)</li>
            <li>No schema has been published yet</li>
            <li>Search/filter returns no results</li>
            <li>Need to show documentation link or action buttons</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Typical Wrapper Pattern</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <pre className="text-neutral-10 overflow-x-auto text-xs">
          {`{resource ? (
  <ResourceContent resource={resource} />
) : (
  <div className="py-6">
    <NotFound
      title="Resource not found"
      description="The resource doesn't exist or you don't have access."
    />
  </div>
)}`}
        </pre>
        <p className="text-neutral-10 mt-2 text-xs">
          Commonly wrapped in div with padding (py-6) as seen in organization-support-ticket.tsx
        </p>
      </div>
    </div>
  </div>
);
