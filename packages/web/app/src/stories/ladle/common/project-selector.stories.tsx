import type { Story } from '@ladle/react';

export default {
  title: 'Common / Project Selector',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Project Selector Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Navigation breadcrumb showing organization (link) / project (selector). Displays
        organization link, separator, and project dropdown for switching between projects within
        current organization.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  organizations: FragmentType<...> | null;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Fragment</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`fragment ProjectSelector_OrganizationConnectionFragment on OrganizationConnection {
  nodes {
    id
    slug
    projects {
      edges {
        node {
          id
          slug
        }
      }
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Breadcrumb Structure</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<>
  {/* Organization Link */}
  <PrimaryNavigationLink linkText="org-slug" />

  {/* Separator */}
  <div className="text-neutral-10 italic">/</div>

  {/* Project Selector */}
  <Select value="project-slug">...</Select>
</>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Loading States</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Organization loading:</p>
          <code className="text-xs">bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full</code>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Project loading:</p>
          <code className="text-xs">bg-neutral-5 h-5 w-48 animate-pulse rounded-full</code>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Behavior</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// Organization link
to: '/$organizationSlug'
params: { organizationSlug }

// Project selector
onValueChange={id => {
  router.navigate({
    to: '/$organizationSlug/$projectSlug',
    params: {
      organizationSlug: currentOrganizationSlug,
      projectSlug: id,
    },
  });
}}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Separator Styling</h4>
      <div className="flex items-center gap-3">
        <code className="text-xs">text-neutral-10 italic</code>
        <span className="text-neutral-11 text-xs">- Forward slash separator between items</span>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Conditional Rendering</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Organization link: Shows if currentOrganization exists, else loading skeleton</li>
        <li>
          Project selector: Shows if projectEdges has length AND currentProject exists, else
          loading skeleton
        </li>
        <li>Separator always shows between organization and project</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Testing Attributes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>data-cy="project-picker-trigger" - Trigger button</li>
        <li>data-cy="project-picker-current" - Current project display</li>
        <li>data-cy="project-picker-option-{'{slug}'}" - Each project option</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Data Traversal</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// Find current organization
const currentOrganization = organizations?.find(
  node => node.slug === currentOrganizationSlug
);

// Get projects for current org
const projectEdges = currentOrganization?.projects.edges;

// Find current project
const currentProject = projectEdges?.find(
  edge => edge.node.slug === currentProjectSlug
)?.node;`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Breadcrumb navigation: organization (clickable) / project (selector)</li>
        <li>Organization link navigates to org overview</li>
        <li>Project selector switches between projects in same org</li>
        <li>Uses GraphQL edges pattern for projects list</li>
        <li>Graceful loading states with skeleton placeholders</li>
        <li>max-w-[200px] on organization skeleton to prevent excessive width</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component uses GraphQL fragments and router
        navigation which require full application context. See actual usage in project layout
        component.
      </p>
    </div>
  </div>
);
