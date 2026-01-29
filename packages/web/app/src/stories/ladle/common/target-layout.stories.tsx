import type { Story } from '@ladle/react';

export default {
  title: 'Common / Target Layout',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Target Layout Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Full page layout for target-level pages. Includes header with full breadcrumb (org /
        project / target), user menu, connect schema dialog, secondary navigation tabs with
        conditional rendering, and target reference context provider.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  page: Page;  // Current active page/tab (required)
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  className?: string;
  children: ReactNode;  // Page content
}

enum Page {
  Schema = 'schema',
  Explorer = 'explorer',
  Checks = 'checks',
  History = 'history',
  Insights = 'insights',
  Traces = 'traces',
  Laboratory = 'laboratory',
  Apps = 'apps',
  Proposals = 'proposals',
  Settings = 'settings',
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Query</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`query TargetLayoutQuery(
  $organizationSlug: String!,
  $projectSlug: String!,
  $targetSlug: String!
) {
  me { ... }
  organizations { ... }
  isCDNEnabled
  organization: organizationBySlug(...) {
    project: projectBySlug(...) {
      target: targetBySlug(...) {
        id
        slug
        viewerCanModifySettings
        graphqlEndpointUrl
        hasSchema
        type  // ProjectType (SINGLE, FEDERATION, etc.)
        proposal { ... }  // For proposal-based workflows
      }
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<TargetReferenceProvider
  organizationSlug={orgSlug}
  projectSlug={projectSlug}
  targetSlug={targetSlug}
>
  <Header>
    <HiveLink />
    <TargetSelector
      currentOrganizationSlug={orgSlug}
      currentProjectSlug={projectSlug}
      currentTargetSlug={targetSlug}
      organizations={data}
    />
    <UserMenu />
  </Header>

  <SecondaryNavigation>
    <Tabs value={page}>
      <TabsList>
        {/* Dynamic tab list based on permissions and features */}
      </TabsList>
    </Tabs>

    {/* Connect Schema Button (if no schema) */}
  </SecondaryNavigation>

  {/* Page Content */}
  {children}
</TargetReferenceProvider>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">TargetReferenceContext</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// Context provides target reference to child components
type TargetReference = {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
};

// Hook for accessing target reference
export const useTargetReference = () => {
  const context = useContext(TargetReferenceContext);
  if (!context) {
    throw new Error('Must be used within TargetReferenceProvider');
  }
  return context;
};`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Tab Rendering Logic</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Schema: Always shown (links to schema page)</li>
        <li>Explorer: Always shown (schema explorer)</li>
        <li>Checks: Only if target has schema (hasSchema === true)</li>
        <li>History: Only if target has schema</li>
        <li>Insights: Only if target has schema</li>
        <li>Traces: Only if isCDNEnabled is true</li>
        <li>Laboratory: Always shown</li>
        <li>Apps: Always shown</li>
        <li>Proposals: Only if proposal workflow is enabled for target</li>
        <li>Settings: Only if viewerCanModifySettings is true</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Connect Schema Dialog</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 mb-2 text-xs">Shown if hasSchema is false:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Dialog with tabs for CLI, GitHub, cURL methods</li>
          <li>Shows GraphQL endpoint URL for target</li>
          <li>InputCopy component for easy copying</li>
          <li>Links to documentation for each method</li>
          <li>Label with LinkIcon showing endpoint</li>
          <li>Method-specific instructions in separate tabs</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Connect Schema Button</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 mb-2 text-xs">Visibility:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Only shown if target.hasSchema is false</li>
          <li>Opens connect schema dialog</li>
          <li>Helps users publish their first schema</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">ProjectType Handling</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">SINGLE</code>
          <span className="text-neutral-11 text-xs">- Single schema project</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">FEDERATION</code>
          <span className="text-neutral-11 text-xs">- Apollo Federation</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">STITCHING</code>
          <span className="text-neutral-11 text-xs">- Schema Stitching</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">CUSTOM</code>
          <span className="text-neutral-11 text-xs">- Custom composition</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Paths</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// Base path: /$organizationSlug/$projectSlug/$targetSlug
Schema    -> /schema
Explorer  -> /explorer
Checks    -> /checks
History   -> /history
Insights  -> /insights
Traces    -> /traces
Laboratory-> /laboratory
Apps      -> /apps
Proposals -> /proposals
Settings  -> /settings`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Error Handling</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Query fetching: Shows loading state</li>
        <li>Target not found: Shows ResourceNotFoundComponent</li>
        <li>Organization/project not found: Shows ResourceNotFoundComponent</li>
        <li>Context usage outside provider: Throws error with helpful message</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">State Management</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>useQuery for GraphQL data fetching (cache-first)</li>
        <li>useToggle for connect schema dialog state</li>
        <li>useResetState for tab state in connect dialog</li>
        <li>useLastVisitedOrganizationWriter for remembering last org</li>
        <li>React Context for target reference sharing</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL client (useQuery)</li>
        <li>@tanstack/react-router - Navigation</li>
        <li>Radix UI - Dialog, Tabs components</li>
        <li>lucide-react - LinkIcon</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Most complex layout with 10 possible page tabs</li>
        <li>Conditional tab rendering based on schema, permissions, features</li>
        <li>TargetReferenceContext provides slugs to deeply nested components</li>
        <li>Connect schema dialog with multi-method instructions</li>
        <li>GraphQL endpoint URL copying for easy integration</li>
        <li>Proposal workflow support (conditional Proposals tab)</li>
        <li>CDN traces feature flag (isCDNEnabled)</li>
        <li>Full breadcrumb navigation (org / project / target)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component is a complex page layout with GraphQL
        queries, context providers, and router navigation. See actual usage in target-level page
        routes.
      </p>
    </div>
  </div>
);
