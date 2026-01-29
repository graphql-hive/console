import type { Story } from '@ladle/react';

export default {
  title: 'Common / Target Selector',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Layout Target Selector Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Full navigation breadcrumb: organization (link) / project (link) / target (selector).
        Displays hierarchy with separators and dropdown for switching between targets within
        current project.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  currentTargetSlug: string;
  organizations: FragmentType<...> | null;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Fragment</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`fragment TargetSelector_OrganizationConnectionFragment on OrganizationConnection {
  nodes {
    id
    slug
    projects {
      edges {
        node {
          id
          slug
          targets {
            edges {
              node {
                id
                slug
              }
            }
          }
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
  <div className="text-neutral-10 italic">/</div>

  {/* Project Link */}
  <PrimaryNavigationLink linkText="project-slug" />
  <div className="text-neutral-10 italic">/</div>

  {/* Target Selector */}
  <Select value="target-slug">...</Select>
</>`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Loading States</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">All items (org, project, target):</p>
          <code className="text-xs">
            bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full
          </code>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Navigation Behavior</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`// Organization link
to: '/$organizationSlug'
params: { organizationSlug }

// Project link
to: '/$organizationSlug/$projectSlug'
params: { organizationSlug, projectSlug }

// Target selector (updates current route params)
onValueChange={id => {
  router.navigate({
    params: { targetSlug: id },
  });
}}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Separator Styling</h4>
      <div className="flex items-center gap-3">
        <code className="text-xs">text-neutral-10 italic</code>
        <span className="text-neutral-11 text-xs">
          - Forward slash separators between all items
        </span>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Conditional Rendering</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Organization: Shows link if exists, else loading skeleton</li>
        <li>Separator 1: Always rendered</li>
        <li>Project: Shows link if org AND project exist, else loading skeleton</li>
        <li>Separator 2: Always rendered</li>
        <li>
          Target: Shows selector if targetEdges has length AND org/project/target all exist, else
          loading skeleton
        </li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Testing Attributes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>data-cy="target-picker-trigger" - Trigger button</li>
        <li>data-cy="target-picker-current" - Current target display</li>
        <li>data-cy="target-picker-option-{'{slug}'}" - Each target option</li>
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
const projects = currentOrganization?.projects.edges;

// Find current project
const currentProject = projects?.find(
  edge => edge.node.slug === currentProjectSlug
)?.node;

// Get targets for current project
const targetEdges = currentProject?.targets.edges;

// Find current target
const currentTarget = targetEdges?.find(
  edge => edge.node.slug === currentTargetSlug
)?.node;`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Full breadcrumb hierarchy: org / project / target</li>
        <li>Organization and project are clickable links</li>
        <li>Target is a selector for switching within current project</li>
        <li>Target navigation only updates targetSlug param (stays on same page)</li>
        <li>Uses nested GraphQL edges pattern (org → projects → targets)</li>
        <li>Three levels of data traversal with optional chaining</li>
        <li>Consistent max-w-[200px] on all loading skeletons</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. The component uses GraphQL fragments and router
        navigation which require full application context. See actual usage in target layout
        component.
      </p>
    </div>
  </div>
);
