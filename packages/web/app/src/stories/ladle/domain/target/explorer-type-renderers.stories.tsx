import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Explorer Type Renderers',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Target Explorer Type Renderer Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        GraphQL schema type renderers for the schema explorer. Each component renders a specific
        GraphQL type with fields, arguments, deprecation status, and usage statistics.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Type Renderer Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>object-type.tsx - GraphQL Object types (most common)</li>
        <li>interface-type.tsx - GraphQL Interface types</li>
        <li>enum-type.tsx - GraphQL Enum types</li>
        <li>scalar-type.tsx - GraphQL Scalar types (built-in and custom)</li>
        <li>union-type.tsx - GraphQL Union types</li>
        <li>input-object-type.tsx - GraphQL Input Object types</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Common Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>GraphQL fragment-based data fetching</li>
        <li>Field-level usage statistics</li>
        <li>Deprecation warnings with reasons</li>
        <li>Type descriptions (optional visibility toggle)</li>
        <li>Expandable field arguments</li>
        <li>Clickable type links for navigation</li>
        <li>Metadata display for supergraph federation</li>
        <li>Syntax highlighting for GraphQL SDL</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Object Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Object types like:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`type User {
  id: ID!
  name: String!
  email: String
  posts: [Post!]!
  createdAt: DateTime!
}`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows all fields with types</li>
          <li>Field arguments in expandable sections</li>
          <li>Non-null (!) and list ([]) indicators</li>
          <li>Usage percentage per field</li>
          <li>Implements interface indicator</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Interface Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Interface types:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Similar to Object type display</li>
          <li>Shows implementing types list</li>
          <li>Field-level usage across all implementations</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Enum Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Enum types:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`enum Role {
  ADMIN
  EDITOR
  VIEWER
}`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Lists all enum values</li>
          <li>Value-level deprecation status</li>
          <li>Usage statistics per value</li>
          <li>Value descriptions</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Scalar Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Scalar types:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`# Built-in scalars
scalar Int
scalar String
scalar Boolean
scalar ID
scalar Float

# Custom scalars
scalar DateTime
scalar JSON
scalar Upload`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows scalar name and description</li>
          <li>Distinguishes built-in vs custom</li>
          <li>No fields to display</li>
          <li>Overall usage statistics</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Union Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Union types:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`union SearchResult = User | Post | Comment`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Lists all possible types</li>
          <li>Clickable type links</li>
          <li>Usage statistics per type option</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Input Object Type Renderer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Renders GraphQL Input Object types:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`input CreateUserInput {
  name: String!
  email: String!
  role: Role = VIEWER
}`}
        </pre>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows all input fields with types</li>
          <li>Default values displayed</li>
          <li>Required (!) indicators</li>
          <li>Field descriptions</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Supporting Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>graphql-fields.tsx - Field list renderer with usage stats</li>
        <li>graphql-arguments.tsx - Field arguments renderer</li>
        <li>common.tsx - Shared UI components and utilities</li>
        <li>super-graph-metadata.tsx - Federation metadata display</li>
        <li>provider.tsx - Context for explorer state</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Fields Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Renders list of fields for Object/Interface types</li>
          <li>Expandable arguments section per field</li>
          <li>Usage percentage visualization</li>
          <li>Deprecated field warnings</li>
          <li>Field description toggle</li>
          <li>Return type with clickable links</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Arguments Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Renders field arguments in expandable section</li>
          <li>Argument name, type, default value</li>
          <li>Required (!) indicators</li>
          <li>Argument descriptions</li>
          <li>Deprecated argument warnings</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Supergraph Metadata</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For Apollo Federation schemas:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows which subgraph defines each field</li>
          <li>@key directive information</li>
          <li>@requires, @provides metadata</li>
          <li>@external field indicators</li>
          <li>Service/subgraph tags</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Statistics Display</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For each field/value:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Percentage bar showing usage frequency</li>
          <li>Unused fields highlighted</li>
          <li>Based on operation tracking data</li>
          <li>Configurable time period via DateRangeFilter</li>
          <li>Helps identify dead code</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Deprecation Display</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For deprecated items:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Warning icon/badge</li>
          <li>Deprecation reason from schema</li>
          <li>Strikethrough or special styling</li>
          <li>Filter to show only deprecated items</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>GraphQL fragments for type-specific data</li>
        <li>useFragment hook for data extraction</li>
        <li>Explorer context for description visibility</li>
        <li>Router links for type navigation</li>
        <li>Tailwind for styling and layout</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Each type renderer is a specialized component</li>
        <li>GraphQL introspection-based rendering</li>
        <li>Usage data integrated from operation tracking</li>
        <li>Descriptions can be toggled on/off globally</li>
        <li>Supports both single and federated schemas</li>
        <li>Metadata filtering for supergraph navigation</li>
        <li>Responsive layout for mobile/desktop</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components render GraphQL schema types with
        fragments, usage data, and complex state. See actual usage in target explorer pages.
      </p>
    </div>
  </div>
);
