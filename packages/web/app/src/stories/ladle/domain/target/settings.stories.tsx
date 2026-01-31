import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Settings',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Target Settings Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Target-level settings components for managing CDN access tokens, registry access tokens, and
        schema contracts. Each component provides CRUD operations for its respective settings.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Settings Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>cdn-access-tokens.tsx - Manage CDN access tokens</li>
        <li>registry-access-token.tsx - Manage registry access tokens</li>
        <li>schema-contracts.tsx - Configure schema contracts</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CDN Access Tokens</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Purpose:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Access GraphQL schema via high-availability CDN</li>
          <li>Used by client applications to fetch schema</li>
          <li>Read-only access to published schema</li>
          <li>Lower latency than direct API calls</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CDN Tokens UI</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Table listing all CDN tokens</li>
          <li>Columns: Alias, Token (masked), Created, Actions</li>
          <li>Create new token button</li>
          <li>Modal for creating token with alias</li>
          <li>Copy token button (shows full token once)</li>
          <li>Delete token button with confirmation</li>
          <li>Warning: token shown only once after creation</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CDN Token Creation</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Alias: String (3-100 chars, identifies the token)

GraphQL Mutation:
mutation CreateCdnAccessToken($input: CreateCdnAccessTokenInput!) {
  createCdnAccessToken(input: $input) {
    ok {
      createdCdnAccessToken { id alias }
      secretAccessToken  // Only returned once!
    }
    error { message }
  }
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Registry Access Tokens</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Purpose:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Authenticate schema publishing from CI/CD</li>
          <li>Read/write access to schema registry</li>
          <li>Scoped permissions (target:read, target:write, etc.)</li>
          <li>Used with Hive CLI</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Registry Tokens UI</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Table listing all registry tokens</li>
          <li>Columns: Name, Scopes, Created, Last Used, Actions</li>
          <li>Create token button</li>
          <li>Modal with name and scope selection</li>
          <li>Scope checkboxes (read, write, delete, etc.)</li>
          <li>Copy token on creation (shown once)</li>
          <li>Revoke token button</li>
          <li>Last used timestamp for auditing</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Registry Token Scopes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">target:read</code>
          <span className="text-neutral-11 text-xs">- Read schema and metadata</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">target:write</code>
          <span className="text-neutral-11 text-xs">- Publish schema changes</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">target:delete</code>
          <span className="text-neutral-11 text-xs">- Delete schema versions</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">target:registry:read</code>
          <span className="text-neutral-11 text-xs">- Read from registry</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">target:registry:write</code>
          <span className="text-neutral-11 text-xs">- Write to registry</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Schema Contracts</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Purpose:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Create filtered views of schema for specific clients</li>
          <li>Tag-based filtering (@internal, @beta, etc.)</li>
          <li>Hide fields from public API</li>
          <li>Separate schemas for mobile vs web</li>
          <li>Federation-compatible</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Schema Contracts UI</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>List of all contracts</li>
          <li>Create contract button</li>
          <li>Contract name and description</li>
          <li>Tag filter configuration</li>
          <li>Include/exclude tag rules</li>
          <li>Contract schema preview</li>
          <li>CDN endpoint for contract</li>
          <li>Edit contract button</li>
          <li>Delete contract with confirmation</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Contract Configuration</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Name: Contract identifier
- Description: Purpose of contract
- Include tags: Show only fields with these tags
- Exclude tags: Hide fields with these tags

Example:
Include: ["public"]
Exclude: ["internal", "deprecated"]

Result: Public API without internal/deprecated fields`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Tag-Based Filtering</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Schema directive example:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`type User {
  id: ID!
  email: String!
  internalId: String! @tag(name: "internal")
  betaFeature: String @tag(name: "beta")
}

# Public contract excludes "internal" tag:
type User {
  id: ID!
  email: String!
  betaFeature: String @tag(name: "beta")
}`}
        </pre>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Common Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>SubPageLayout with header and actions</li>
        <li>Table component for listing items</li>
        <li>Modal dialogs for create/edit/delete</li>
        <li>Formik + Yup for form validation</li>
        <li>GraphQL mutations for CRUD operations</li>
        <li>Toast notifications for success/error</li>
        <li>Confirmation dialogs for destructive actions</li>
        <li>Copy-to-clipboard for tokens</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Security Considerations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Tokens shown only once after creation</li>
        <li>Masked tokens in list view</li>
        <li>Token revocation immediately invalidates access</li>
        <li>Last used timestamp for auditing</li>
        <li>Scoped permissions (principle of least privilege)</li>
        <li>Warning about storing tokens securely</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateCdnAccessToken - Create CDN token</li>
        <li>DeleteCdnAccessToken - Revoke CDN token</li>
        <li>CreateToken - Create registry token</li>
        <li>DeleteToken - Revoke registry token</li>
        <li>CreateContract - Create schema contract</li>
        <li>UpdateContract - Edit contract rules</li>
        <li>DeleteContract - Remove contract</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations</li>
        <li>Formik - Form state</li>
        <li>Yup - Validation schemas</li>
        <li>Table (v2) - Data tables</li>
        <li>Modal (v2) - Dialog modals</li>
        <li>InlineCode (v2) - Token display</li>
        <li>TimeAgo (v2) - Timestamp formatting</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CDN tokens for high-availability schema access</li>
        <li>Registry tokens for CI/CD authentication</li>
        <li>Contracts enable client-specific schema views</li>
        <li>Tag-based filtering without duplicating schema</li>
        <li>Tokens displayed once for security</li>
        <li>Last used tracking for audit trails</li>
        <li>Scoped permissions limit token capabilities</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components manage target settings with GraphQL
        mutations, forms, and tables. See actual usage in target settings pages.
      </p>
    </div>
  </div>
);
