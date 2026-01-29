import type { Story } from '@ladle/react';

export default {
  title: 'Common / Organization Layout',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Organization Layout Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Full page layout for organization-level pages. Includes header with org selector, user
        menu, create project dialog, secondary navigation tabs, billing warnings, and content area.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  page?: Page;  // Current active page/tab
  className?: string;
  organizationSlug: string;
  children: ReactNode;  // Page content
}

enum Page {
  Overview = 'overview',
  Members = 'members',
  Settings = 'settings',
  Support = 'support',
  Subscription = 'subscription',
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Query</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`query OrganizationLayoutQuery($organizationSlug: String!) {
  me {
    id
    provider
    ...UserMenu_MeFragment
  }
  organizationBySlug(organizationSlug: $organizationSlug) {
    id
  }
  organizations {
    ...OrganizationSelector_OrganizationConnectionFragment
    ...UserMenu_OrganizationConnectionFragment
    nodes {
      ...OrganizationLayout_OrganizationFragment
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Organization Fragment</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`fragment OrganizationLayout_OrganizationFragment on Organization {
  id
  slug
  viewerCanCreateProject
  viewerCanManageSupportTickets
  viewerCanDescribeBilling
  viewerCanSeeMembers
  ...ProPlanBilling_OrganizationFragment
  ...RateLimitWarn_OrganizationFragment
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<Header>
  <HiveLink />
  <OrganizationSelector
    currentOrganizationSlug={slug}
    organizations={data}
    isOIDCUser={isOIDC}
  />
  <UserMenu />
</Header>

<SecondaryNavigation>
  <Tabs>
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="members">Members</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
      {/* Conditional tabs based on permissions */}
    </TabsList>
  </Tabs>

  {/* Create Project Button */}
  <Button onClick={toggleModal}>
    <PlusIcon /> New Project
  </Button>
</SecondaryNavigation>

{/* Billing Warnings */}
<ProPlanBilling organization={org} />
<RateLimitWarn organization={org} />

{/* Page Content */}
{children}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Project Dialog</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Dialog with form for creating new project:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Project name input field</li>
          <li>Project type radio group (SINGLE, FEDERATION, STITCHING, CUSTOM)</li>
          <li>Icons for each project type (BoxIcon, BlocksIcon, FoldVerticalIcon)</li>
          <li>Form validation with zod schema</li>
          <li>CreateProject GraphQL mutation</li>
          <li>Navigation to new project on success</li>
          <li>Toast notification for errors</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Conditional Tab Rendering</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Members tab: Only if viewerCanSeeMembers is true</li>
        <li>Settings tab: Always shown</li>
        <li>Support tab: Only if viewerCanManageSupportTickets is true</li>
        <li>Subscription tab: Only if Stripe is enabled AND viewerCanDescribeBilling is true</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Project Button</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 mb-2 text-xs">Shown if:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>viewerCanCreateProject is true</li>
          <li>Shows PlusIcon and "New Project" text</li>
          <li>Opens create project dialog on click</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Project Type Options</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">SINGLE</code>
          <span className="text-neutral-11 text-xs">- Single Schema (BoxIcon)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">FEDERATION</code>
          <span className="text-neutral-11 text-xs">- Apollo Federation (BlocksIcon)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">STITCHING</code>
          <span className="text-neutral-11 text-xs">- Schema Stitching (FoldVerticalIcon)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">CUSTOM</code>
          <span className="text-neutral-11 text-xs">- Custom Composition (no icon)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Error Handling</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Query error: Shows QueryError component</li>
        <li>Organization not found: Shows NotFoundContent with back button</li>
        <li>Create project error: Toast notification with error message</li>
        <li>Form validation: Inline FormMessage for invalid inputs</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">State Management</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>useQuery for GraphQL data fetching (cache-first)</li>
        <li>useToggle for modal open/close state</li>
        <li>useForm with zodResolver for form state and validation</li>
        <li>useMutation for creating projects</li>
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
        <li>Radix UI - Dialog, Slot, Tabs components</li>
        <li>lucide-react - Icons (BoxIcon, BlocksIcon, FoldVerticalIcon)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Full page layout container for organization-level pages</li>
        <li>Permission-based rendering for tabs and create button</li>
        <li>Integrated billing warnings (pro plan, rate limits)</li>
        <li>OIDC user detection from me.provider (AuthProviderType)</li>
        <li>Create project dialog with project type selection</li>
        <li>Automatic navigation to new project after creation</li>
        <li>Tracks last visited organization for convenience</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component is a complex page layout with GraphQL
        queries, mutations, forms, and router navigation. See actual usage in organization-level
        page routes.
      </p>
    </div>
  </div>
);
