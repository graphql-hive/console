import type { Story } from '@ladle/react';
import { EmptyList, noSchema, NoSchemaVersion, noValidSchemaVersion } from '@/components/ui/empty-list';
import { Button } from '@/components/ui/button';
import { ProjectType } from '@/gql/graphql';

export const Basic: Story = () => (
  <EmptyList
    title="Service not found"
    description="You can publish the missing service with Hive CLI"
  />
);

Basic.meta = {
  description: 'Basic empty list with title and description, based on target.tsx usage',
};

export const WithDocsLink: Story = () => (
  <EmptyList
    title="No data available"
    description="Learn how to get started with publishing your first schema"
    docsUrl="/features/schema-registry#publish-a-schema"
  />
);

WithDocsLink.meta = {
  description: 'Empty list with documentation link',
};

export const WithCustomChildren: Story = () => (
  <EmptyList
    title="No projects found"
    description="Create your first project to get started"
  >
    <div className="flex gap-2 pt-4">
      <Button>Create Project</Button>
      <Button variant="outline">Learn More</Button>
    </div>
  </EmptyList>
);

WithCustomChildren.meta = {
  description: 'Empty list with custom action buttons',
};

export const PrebuiltNoSchema: Story = () => noSchema;

PrebuiltNoSchema.meta = {
  description: 'Pre-built "Schema Registry contains no schema" state used in target.tsx',
};

export const PrebuiltNoValidSchema: Story = () => noValidSchemaVersion;

PrebuiltNoValidSchema.meta = {
  description:
    'Pre-built "waiting for your first composable schema version" state used in target-explorer.tsx',
};

export const NoSchemaVersionPublish: Story = () => (
  <NoSchemaVersion projectType={ProjectType.Single} recommendedAction="publish" />
);

NoSchemaVersionPublish.meta = {
  description: 'NoSchemaVersion with publish action for single project, used in target.tsx',
};

export const NoSchemaVersionPublishFederation: Story = () => (
  <NoSchemaVersion projectType={ProjectType.Federation} recommendedAction="publish" />
);

NoSchemaVersionPublishFederation.meta = {
  description:
    'NoSchemaVersion with publish action for federation project (shows service/url flags)',
};

export const NoSchemaVersionCheck: Story = () => (
  <NoSchemaVersion projectType={ProjectType.Single} recommendedAction="check" />
);

NoSchemaVersionCheck.meta = {
  description: 'NoSchemaVersion with check action, used in target-checks.tsx',
};

export const NoSchemaVersionCheckFederation: Story = () => (
  <NoSchemaVersion projectType={ProjectType.Federation} recommendedAction="check" />
);

NoSchemaVersionCheckFederation.meta = {
  description:
    'NoSchemaVersion with check action for federation project (shows service/url flags)',
};

export const NoSchemaVersionNoAction: Story = () => (
  <NoSchemaVersion projectType={null} recommendedAction="none" />
);

NoSchemaVersionNoAction.meta = {
  description: 'NoSchemaVersion without any recommended action or CLI command',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">EmptyList Component</h2>
      <p className="text-neutral-11 mb-4">
        Empty state component for displaying when no data is available. Shows a magnifier
        illustration with title, description, optional children, and optional documentation link.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Empty State</p>
          <EmptyList
            title="No items found"
            description="Start by adding your first item"
          />
          <p className="text-xs text-neutral-10">
            Container: <code className="text-neutral-12">Card with bg-neutral-1</code>
            <br />
            Title: <code className="text-neutral-12">Heading component (text-neutral-12)</code>
            <br />
            Description:{' '}
            <code className="text-neutral-12">text-neutral-10 text-sm font-medium</code>
            <br />
            Layout: <code className="text-neutral-12">
              min-h-[400px] flex-col items-center gap-y-2
            </code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Documentation Link</p>
          <EmptyList
            title="No schema published"
            description="Publish your first schema to get started"
            docsUrl="/docs/getting-started"
          />
          <p className="text-xs text-neutral-10">
            Docs link rendered with <code className="text-neutral-12">DocsLink</code> component
            below children
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Custom Children</p>
          <EmptyList
            title="Get started"
            description="Create your first resource"
          >
            <div className="flex gap-2 pt-2">
              <Button size="sm">Create</Button>
              <Button size="sm" variant="outline">
                Import
              </Button>
            </div>
          </EmptyList>
          <p className="text-xs text-neutral-10">
            Children can be any React node, commonly used for action buttons or additional info
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">NoSchemaVersion Component</h2>
      <p className="text-neutral-11 mb-4">
        Special empty state for targets without schema versions. Shows CLI commands based on
        project type and recommended action.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Single Project - Publish</p>
          <NoSchemaVersion projectType={ProjectType.Single} recommendedAction="publish" />
          <p className="text-xs text-neutral-10">
            Shows simple <code className="text-neutral-12">hive schema:publish</code> command
            without service flags
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Federation Project - Publish</p>
          <NoSchemaVersion projectType={ProjectType.Federation} recommendedAction="publish" />
          <p className="text-xs text-neutral-10">
            Shows <code className="text-neutral-12">--service</code> and{' '}
            <code className="text-neutral-12">--url</code> flags for distributed systems
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Check Action</p>
          <NoSchemaVersion projectType={ProjectType.Single} recommendedAction="check" />
          <p className="text-xs text-neutral-10">
            Shows <code className="text-neutral-12">hive schema:check</code> command with
            explanation
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="space-y-2">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">EmptyList</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">title</code>: string (required) - Main heading
            </li>
            <li>
              <code className="text-neutral-12">description</code>: string (required) -
              Descriptive text
            </li>
            <li>
              <code className="text-neutral-12">docsUrl</code>: string | null (optional) - Link
              to documentation
            </li>
            <li>
              <code className="text-neutral-12">children</code>: ReactNode | null (optional) -
              Custom content
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional) - Additional
              CSS classes
            </li>
          </ul>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">NoSchemaVersion</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">projectType</code>: ProjectType | null - Used to
              determine CLI command flags
            </li>
            <li>
              <code className="text-neutral-12">recommendedAction</code>: "publish" | "check" |
              "none" - Determines which CLI command to show
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Pre-built Exports</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            <code className="text-neutral-12">noSchema</code> - "Schema Registry contains no
            schema" (used in target.tsx)
          </li>
          <li>
            <code className="text-neutral-12">noValidSchemaVersion</code> - "waiting for your
            first composable schema version" (used in target-explorer.tsx)
          </li>
          <li>
            <code className="text-neutral-12">NoSchemaVersion</code> - Component with dynamic CLI
            commands (used in multiple pages)
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Visual Elements</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            Image: <code className="text-neutral-12">magnifier.svg</code> (200x200px)
          </li>
          <li>
            Layout: <code className="text-neutral-12">Card</code> component with centered content
          </li>
          <li>
            Minimum height: <code className="text-neutral-12">min-h-[400px]</code>
          </li>
          <li>
            Spacing: <code className="text-neutral-12">gap-y-2</code> between elements
          </li>
          <li>Test attribute: data-cy="empty-list"</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">No Schema Published</p>
          <p className="text-neutral-10 text-xs">
            Display when a target has no schema versions. Use NoSchemaVersion component with
            appropriate recommendedAction.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Service Not Found</p>
          <p className="text-neutral-10 text-xs">
            Display when a specific service is missing from a composite schema (target.tsx).
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Empty Lists</p>
          <p className="text-neutral-10 text-xs">
            Generic empty state for any list or collection with no items (projects, apps,
            checks, etc.).
          </p>
        </div>
      </div>
    </div>
  </div>
);
