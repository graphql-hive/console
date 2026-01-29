import type { Story } from '@ladle/react';

export default {
  title: 'Common / Project Layout',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Project Layout Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Full page layout for project-level pages. Includes header with project breadcrumb selector,
        user menu, create target dialog, secondary navigation tabs, and content area.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  page: Page;  // Current active page/tab (required)
  organizationSlug: string;
  projectSlug: string;
  className?: string;
  children: ReactNode;  // Page content
}

enum Page {
  Targets = 'targets',
  Alerts = 'alerts',
  Settings = 'settings',
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Query</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`query ProjectLayoutQuery(
  $organizationSlug: String!,
  $projectSlug: String!
) {
  me {
    id
    ...UserMenu_MeFragment
  }
  organizations {
    ...ProjectSelector_OrganizationConnectionFragment
    ...UserMenu_OrganizationConnectionFragment
  }
  organization: organizationBySlug(organizationSlug: $organizationSlug) {
    id
    slug
    project: projectBySlug(projectSlug: $projectSlug) {
      id
      slug
      viewerCanModifySchemaPolicy
      viewerCanCreateTarget
      viewerCanModifyAlerts
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<Header>
  <HiveLink />
  <ProjectSelector
    currentOrganizationSlug={orgSlug}
    currentProjectSlug={projectSlug}
    organizations={data}
  />
  <UserMenu />
</Header>

<SecondaryNavigation>
  <Tabs value={page}>
    <TabsList>
      <TabsTrigger value="targets">Targets</TabsTrigger>
      <TabsTrigger value="alerts">Alerts</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
  </Tabs>

  {/* Create Target Button */}
  <Button onClick={toggleModal}>
    <PlusIcon /> New Target
  </Button>
</SecondaryNavigation>

{/* Page Content */}
{children}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Target Dialog</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Dialog with form for creating new target:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Target name input field (slug format validation)</li>
          <li>Form validation with zod schema</li>
          <li>CreateTarget GraphQL mutation</li>
          <li>Navigation to new target on success</li>
          <li>Toast notification for errors</li>
          <li>Dialog closes on success or cancel</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Tab Navigation</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">Targets</code>
          <span className="text-neutral-11 text-xs">
            - Links to /$organizationSlug/$projectSlug
          </span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Alerts</code>
          <span className="text-neutral-11 text-xs">
            - Links to /$organizationSlug/$projectSlug/alerts
          </span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Settings</code>
          <span className="text-neutral-11 text-xs">
            - Links to /$organizationSlug/$projectSlug/settings
          </span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Target Button</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 mb-2 text-xs">Shown if:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>viewerCanCreateTarget is true</li>
          <li>Shows PlusIcon and "New Target" text</li>
          <li>Opens create target dialog on click</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Target Name Validation</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Target name is required')
    .max(50, 'Target name must be less than 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Target name can only contain lowercase letters, numbers, and hyphens'
    ),
});`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation After Creation</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// On successful target creation
router.navigate({
  to: '/$organizationSlug/$projectSlug/$targetSlug',
  params: {
    organizationSlug,
    projectSlug,
    targetSlug: result.data.createTarget.ok.target.slug,
  },
});`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Error Handling</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Query fetching: Shows loading state</li>
        <li>Organization/project not found: Shows ResourceNotFoundComponent</li>
        <li>Create target error: Toast notification with error message</li>
        <li>Form validation: Inline FormMessage for invalid slug format</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">State Management</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>useQuery for GraphQL data fetching (cache-first)</li>
        <li>useToggle for modal open/close state</li>
        <li>useForm with zodResolver for form state and validation</li>
        <li>useMutation for creating targets</li>
        <li>useLastVisitedOrganizationWriter for remembering last org</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL client (useQuery, useMutation)</li>
        <li>react-hook-form - Form state management</li>
        <li>zod - Form validation schema</li>
        <li>@tanstack/react-router - Navigation</li>
        <li>Radix UI - Dialog, Tabs components</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Full page layout container for project-level pages</li>
        <li>Breadcrumb navigation showing org / project hierarchy</li>
        <li>Permission-based rendering for create target button</li>
        <li>Slug validation for target names (lowercase, numbers, hyphens only)</li>
        <li>Automatic navigation to new target after creation</li>
        <li>Active tab indicator via page prop</li>
        <li>Tracks last visited organization for convenience</li>
        <li>ResourceNotFoundComponent for 404 states</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component is a complex page layout with GraphQL
        queries, mutations, forms, and router navigation. See actual usage in project-level page
        routes.
      </p>
    </div>
  </div>
);
