import type { Story } from '@ladle/react';

export default {
  title: 'Common / Organization Selectors',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Organization Selector Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Navigation breadcrumb selector for switching between organizations. Renders as Select for
        regular users or static link for OIDC users. Uses GraphQL fragment for organization data.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  currentOrganizationSlug: string;
  organizations: FragmentType<...> | null;
  isOIDCUser: boolean;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Fragment</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`fragment OrganizationSelector_OrganizationConnectionFragment on OrganizationConnection {
  nodes {
    id
    slug
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Render Modes</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Loading State:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>organizations is null</li>
            <li>Shows skeleton: bg-neutral-5 h-5 w-48 animate-pulse rounded-full</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">OIDC User Mode:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>isOIDCUser is true</li>
            <li>Renders PrimaryNavigationLink (static, no switching allowed)</li>
            <li>Links to /$organizationSlug</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Regular User Mode:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>isOIDCUser is false</li>
            <li>Renders Select dropdown with organization options</li>
            <li>onChange navigates to selected organization</li>
            <li>data-cy="organization-picker-trigger"</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Behavior</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`onValueChange={id => {
  void router.navigate({
    to: '/$organizationSlug',
    params: { organizationSlug: id },
  });
}}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Select Styling</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">SelectTrigger variant="default"</code>
          <span className="text-neutral-11 text-xs">- Default trigger variant</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">font-medium</code>
          <span className="text-neutral-11 text-xs">- Current organization slug styling</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Testing Attributes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>data-cy="organization-picker-trigger" - Trigger button</li>
        <li>data-cy="organization-picker-current" - Current organization display</li>
        <li>data-cy="organization-picker-option-{'{slug}'}" - Each organization option</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>@tanstack/react-router - useRouter for navigation</li>
        <li>GraphQL fragment with useFragment hook</li>
        <li>PrimaryNavigationLink component (for OIDC mode)</li>
        <li>Select, SelectContent, SelectItem, SelectTrigger (UI components)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>OIDC users cannot switch organizations (single org restriction)</li>
        <li>Fragment data is null during loading</li>
        <li>Finds current organization by matching slug</li>
        <li>SelectItem key and value both use org.slug</li>
        <li>Navigates to organization overview page on change</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component uses GraphQL fragments and router
        navigation which require full application context. See actual usage in layout components.
      </p>
    </div>
  </div>
);
