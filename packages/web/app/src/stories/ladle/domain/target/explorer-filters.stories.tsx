import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Explorer Filters',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Target Explorer Filter Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Collection of filter components for the schema explorer. Includes type search, field name
        filter, date range, schema variant tabs, descriptions toggle, and metadata filters.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Exports</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>TypeFilter - Autocomplete search for GraphQL types</li>
        <li>FieldByNameFilter - Input to filter fields by name</li>
        <li>DateRangeFilter - Date range picker for usage data</li>
        <li>DescriptionsVisibilityFilter - Toggle to show/hide descriptions</li>
        <li>SchemaVariantFilter - Tabs for All/Unused/Deprecated types</li>
        <li>MetadataFilter - Dropdown menu for filtering by metadata</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">TypeFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<TypeFilter
  typename="User"
  organizationSlug="my-org"
  projectSlug="my-project"
  targetSlug="production"
  period={{ from: "2024-01-01", to: "2024-01-31" }}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Uses Autocomplete (react-select with virtualization)</li>
          <li>GraphQL query to fetch all named types from schema</li>
          <li>Navigates to /$organizationSlug/$projectSlug/$targetSlug/explorer/$typename</li>
          <li>Shows loading state while fetching</li>
          <li>min-w-[200px] grow cursor-text</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">FieldByNameFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<FieldByNameFilter />`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Input component for filtering by field name</li>
          <li>Updates URL search param: ?search=value</li>
          <li>Reads from router.latestLocation.search.search</li>
          <li>Uses replace: true for navigation (no history)</li>
          <li>w-[200px] grow cursor-text</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">DateRangeFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<DateRangeFilter />`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Uses DateRangePicker component</li>
          <li>Valid units: y, M, w, d (year, month, week, day)</li>
          <li>Reads/writes from usePeriodSelector context</li>
          <li>Align: end</li>
          <li>Updates schema explorer period for usage data</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">DescriptionsVisibilityFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<DescriptionsVisibilityFilter />`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Switch component with label "Show descriptions"</li>
          <li>Uses useDescriptionsVisibleToggle from provider</li>
          <li>Wrapped in Tooltip with explanation</li>
          <li>bg-neutral-2 flex h-[40px] rounded-md border px-3</li>
          <li>Default: descriptions hidden</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">SchemaVariantFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<SchemaVariantFilter
  organizationSlug="my-org"
  projectSlug="my-project"
  targetSlug="production"
  variant="all"  // or "unused" | "deprecated"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Tabs:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>All - Shows all types (default)</li>
          <li>Unused - Types not used in any operation</li>
          <li>Deprecated - Types marked as deprecated</li>
          <li>Each tab has tooltip explaining what it shows</li>
          <li>Navigation paths: /explorer, /explorer/unused, /explorer/deprecated</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">MetadataFilter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<MetadataFilter
  options={[
    { name: "Service", values: ["users", "products", "orders"] },
    { name: "Team", values: ["backend", "frontend"] },
  ]}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>DropdownMenu with FilterIcon button</li>
          <li>Grouped checkboxes for metadata filters</li>
          <li>Click group name to toggle all values</li>
          <li>Uses useSchemaExplorerContext for state</li>
          <li>max-h-[300px] overflow-y-auto scrollable</li>
          <li>DropdownMenuSeparator between groups</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Context Providers</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>useSchemaExplorerContext - Metadata filter state management</li>
        <li>usePeriodSelector - Date range state</li>
        <li>useDescriptionsVisibleToggle - Descriptions visibility toggle</li>
        <li>All provided by explorer/provider.tsx</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">TypeFilter GraphQL Query</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`query TypeFilter_AllTypes(
  $organizationSlug: String!
  $projectSlug: String!
  $targetSlug: String!
  $period: DateRangeInput!
) {
  target(reference: { bySelector: { ... } }) {
    latestValidSchemaVersion {
      explorer(usage: { period: $period }) {
        types {
          ... on GraphQLObjectType { name }
          ... on GraphQLInterfaceType { name }
          ... on GraphQLUnionType { name }
          ... on GraphQLEnumType { name }
          ... on GraphQLInputObjectType { name }
          ... on GraphQLScalarType { name }
        }
      }
    }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL queries</li>
        <li>@tanstack/react-router - Navigation and search params</li>
        <li>lucide-react - FilterIcon</li>
        <li>Autocomplete (v2) - Type search with virtualization</li>
        <li>DateRangePicker - Date range selection</li>
        <li>DropdownMenu - Metadata filter</li>
        <li>Tooltip - Filter explanations</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>All filters integrate with router for URL-based state</li>
        <li>TypeFilter queries all schema types with usage period</li>
        <li>FieldByNameFilter uses search param for client-side filtering</li>
        <li>DateRangeFilter affects usage data across explorer</li>
        <li>SchemaVariantFilter changes route path (not search param)</li>
        <li>MetadataFilter supports bulk toggle of all values in group</li>
        <li>Descriptions hidden by default for cleaner UI</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components use GraphQL queries, router navigation,
        and schema explorer context. See actual usage in target explorer pages.
      </p>
    </div>
  </div>
);
