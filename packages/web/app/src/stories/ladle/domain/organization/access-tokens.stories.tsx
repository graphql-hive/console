import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Organization / Access Tokens',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Organization Access Tokens Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Access token management for organization-level and personal API authentication. Includes
        organization tokens (shared across team) and personal access tokens (individual user
        tokens).
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Access Token Types</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Organization Tokens - Shared team tokens with granular permissions</li>
        <li>Personal Access Tokens (PAT) - Individual user tokens for CLI/API access</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Organization Tokens Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>access-tokens-sub-page.tsx - Main page with token list</li>
        <li>access-tokens-table.tsx - Table of organization tokens</li>
        <li>create-access-token-sheet-content.tsx - Create token form</li>
        <li>access-token-detail-view-sheet.tsx - Token details drawer</li>
        <li>delete-access-token-confirmation-dialogue.tsx - Delete confirmation</li>
        <li>permission-detail-view.tsx - Permission breakdown display</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Personal Access Tokens Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>personal-access-tokens-sub-page.tsx - PAT management page</li>
        <li>personal-access-tokens-table.tsx - Table of user's PATs</li>
        <li>create-personal-access-token-sheet-content.tsx - Create PAT form</li>
        <li>personal-access-token-detail-view-sheet.tsx - PAT details drawer</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Organization Token Table</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Name (token identifier)
- Permissions (scope badges)
- Created By (user who created)
- Created (date)
- Last Used (timestamp)
- Actions (View, Delete)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Sortable columns</li>
          <li>Search by name</li>
          <li>Filter by permissions</li>
          <li>Create token button</li>
          <li>Permission badges (color-coded)</li>
          <li>Unused token warning (never used)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Organization Token</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Token Name: String (required, 3-100 chars)
- Description: Text (optional)
- Permissions: Multi-select checkboxes
  - Organization Read/Write
  - Project Read/Write/Create/Delete
  - Target Read/Write/Create/Delete
  - Schema Read/Write/Delete
  - Members Read/Write
- Resource Scope: (optional)
  - All projects
  - Specific projects (multi-select)
- Expiration: Optional expiry date`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Flow:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Click "Create Token" button</li>
          <li>Sheet/drawer opens from right</li>
          <li>Fill in token details</li>
          <li>Select permissions (checkboxes)</li>
          <li>Optionally scope to specific projects</li>
          <li>Set expiration (optional)</li>
          <li>Click "Create" button</li>
          <li>Token displayed ONCE with copy button</li>
          <li>Warning: save token now, won't be shown again</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Token Detail View</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Displays:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Token name and description</li>
          <li>Token prefix (first 8 chars, rest masked)</li>
          <li>Created by user with avatar</li>
          <li>Created date and time</li>
          <li>Last used timestamp</li>
          <li>Usage count (total API calls)</li>
          <li>Permission list (grouped by resource)</li>
          <li>Resource scope (if scoped)</li>
          <li>Expiration date (if set)</li>
          <li>Revoke button</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Permission Detail View</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Grouped permission display:</p>
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`Organization:
  ✓ Read
  ✓ Write

Projects:
  ✓ Read
  ✓ Create
  ✓ Write
  ✗ Delete (not granted)
  Scope: project-a, project-b

Targets:
  ✓ Read
  ✓ Write`}
        </pre>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Personal Access Tokens (PAT)</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Differences from org tokens:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Belongs to individual user (not shared)</li>
          <li>Inherits user's permissions (can't exceed)</li>
          <li>Only user can see/manage their PATs</li>
          <li>Used for Hive CLI authentication</li>
          <li>Simpler permission model (inherit from user)</li>
          <li>Can optionally limit to fewer permissions</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Personal Access Token</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Token Name: String (required)
- Description: Text (optional)
- Permissions: Inherited from user (shown read-only)
  - Option to reduce permissions (cannot exceed user's)
- Expiration: Optional expiry date

Example:
User has: project:read, project:write, target:read
PAT can have: Any subset of the above
PAT cannot have: target:write (user doesn't have it)`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Token Security Features</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Token shown only once at creation</li>
        <li>Masked in list view (prefix only)</li>
        <li>Automatic expiration (optional)</li>
        <li>Last used tracking for auditing</li>
        <li>Immediate revocation on delete</li>
        <li>Scoped permissions (principle of least privilege)</li>
        <li>Usage tracking (API call count)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Delete Token Confirmation</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Confirmation dialog:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Shows token name</li>
          <li>Warning about API calls failing</li>
          <li>Last used timestamp reminder</li>
          <li>Destructive action styling (red)</li>
          <li>Requires explicit confirmation</li>
          <li>Immediately revokes access</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Token Usage Examples</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`# Hive CLI
hive schema:publish schema.graphql \\
  --token "hive_pat_abc123..."

# HTTP API
curl -H "Authorization: Bearer hive_pat_abc123..." \\
  https://api.hive.com/graphql

# GraphQL Client
const client = new GraphQLClient('https://api.hive.com/graphql', {
  headers: { 'Authorization': 'Bearer hive_pat_abc123...' }
});`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Token Prefix Format</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">hive_org_abc123...</code>
          <span className="text-neutral-11 text-xs">- Organization token</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">hive_pat_xyz789...</code>
          <span className="text-neutral-11 text-xs">- Personal access token</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateOrganizationToken - Create org token</li>
        <li>DeleteOrganizationToken - Revoke org token</li>
        <li>CreatePersonalAccessToken - Create PAT</li>
        <li>DeletePersonalAccessToken - Revoke PAT</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>OrganizationTokens - List all org tokens</li>
        <li>OrganizationToken - Get single token details</li>
        <li>MyPersonalAccessTokens - List user's PATs</li>
        <li>PersonalAccessToken - Get single PAT details</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">UI Components Used</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Sheet - Right drawer for create/detail views</li>
        <li>Table - Token list display</li>
        <li>Badge - Permission indicators</li>
        <li>Checkbox - Permission selector</li>
        <li>Dialog - Delete confirmation</li>
        <li>InputCopy - Token copying</li>
        <li>TimeAgo - Timestamp formatting</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations and queries</li>
        <li>Sheet component - Drawer UI</li>
        <li>Table (v2) - Token table</li>
        <li>Badge component - Status indicators</li>
        <li>Toast - Success/error notifications</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Organization tokens for shared team access</li>
        <li>Personal tokens for individual CLI usage</li>
        <li>Granular permission model with resource scoping</li>
        <li>Token security with one-time display</li>
        <li>Audit trail with last used tracking</li>
        <li>Optional expiration for temporary access</li>
        <li>Immediate revocation on deletion</li>
        <li>Permission inheritance for PATs</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components manage API access tokens with GraphQL
        mutations, complex permissions, and security features. See actual usage in organization
        settings pages.
      </p>
    </div>
  </div>
);
