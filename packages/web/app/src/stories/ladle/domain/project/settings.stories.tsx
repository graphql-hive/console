import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Project / Settings',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Project Settings Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Project-level settings for schema composition configuration and project-scoped access
        tokens. Supports different composition strategies for single schema, federation, stitching,
        and custom approaches.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Settings Categories</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Composition Settings - Schema composition strategy</li>
        <li>Access Tokens - Project-scoped API tokens</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>composition.tsx - Main composition settings page</li>
        <li>native-composition.tsx - Hive native composition (default)</li>
        <li>external-composition.tsx - External composition service</li>
        <li>legacy-composition.tsx - Deprecated composition method</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Project Types and Composition</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Single Schema (SINGLE):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>One schema file, no composition needed</li>
            <li>Simplest setup</li>
            <li>Best for monolithic GraphQL servers</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Federation (FEDERATION):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Apollo Federation composition</li>
            <li>Multiple subgraphs/services</li>
            <li>Native or external composition</li>
            <li>Supports @key, @requires, @provides directives</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Stitching (STITCHING):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Schema stitching approach</li>
            <li>Merge multiple schemas</li>
            <li>Type merging and delegation</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Custom (CUSTOM):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Custom composition logic</li>
            <li>External composition service required</li>
            <li>Full control over composition</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Native Composition</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Hive's built-in composition (recommended):</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>No external service needed</li>
          <li>Supports Apollo Federation v1 and v2</li>
          <li>Automatic schema validation</li>
          <li>Breaking change detection</li>
          <li>Composition error reporting</li>
          <li>Fast composition (milliseconds)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">External Composition</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Configuration:
- Composition Endpoint: URL to composition service
- Authentication: Optional bearer token
- Timeout: Request timeout (seconds)

Example endpoint:
https://my-composition-service.com/compose

POST request body:
{
  "services": [
    { "name": "users", "sdl": "type User { ... }" },
    { "name": "products", "sdl": "type Product { ... }" }
  ]
}

Expected response:
{
  "supergraph": "# Composed schema SDL..."
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">External Composition Use Cases</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Custom composition logic beyond Federation</li>
        <li>Integration with existing composition pipeline</li>
        <li>Pre-processing schemas before composition</li>
        <li>Custom directive handling</li>
        <li>Proprietary composition algorithms</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Legacy Composition</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Deprecated approach:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Old composition method (pre-v2)</li>
          <li>Shown for backward compatibility</li>
          <li>Migration guide displayed</li>
          <li>Warning to upgrade to native/external</li>
          <li>May be removed in future</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Settings UI</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Page sections:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Current composition method badge</li>
          <li>Switch composition method dropdown</li>
          <li>Method-specific configuration form</li>
          <li>Test composition button</li>
          <li>Save settings button</li>
          <li>Composition history/logs</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Project Access Tokens</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>project-access-tokens-sub-page.tsx - Main tokens page</li>
        <li>project-access-tokens-table.tsx - Token list table</li>
        <li>project-access-token-detail-view-sheet.tsx - Token details</li>
        <li>create-project-access-token-sheet-content.tsx - Create token form</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Project Token vs Organization Token</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Project Token:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Scoped to single project</li>
            <li>Can access all targets in project</li>
            <li>Cannot access other projects</li>
            <li>Simpler permission model</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Organization Token:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Can access multiple projects</li>
            <li>Requires explicit project scope</li>
            <li>More complex permissions</li>
            <li>Better for cross-project automation</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Create Project Access Token</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Form fields:
- Token Name: String (required)
- Description: Text (optional)
- Target Scope: (optional)
  - All targets in project
  - Specific targets (multi-select)
- Permissions:
  - Target Read (view schema)
  - Target Write (publish schema)
  - Target Delete (delete versions)
- Expiration: Optional expiry date`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Project Token Table</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Name (token identifier)
- Target Scope (All / Specific targets)
- Permissions (badges)
- Created (date)
- Last Used (timestamp)
- Actions (View, Delete)`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>UpdateProjectComposition - Change composition method</li>
        <li>SetExternalComposition - Configure external endpoint</li>
        <li>TestComposition - Validate composition settings</li>
        <li>CreateProjectToken - Create project-scoped token</li>
        <li>DeleteProjectToken - Revoke project token</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>ProjectCompositionSettings - Current composition config</li>
        <li>ProjectTokens - List project tokens</li>
        <li>ProjectToken - Single token details</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Validation</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">On schema publish:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Subgraph SDL received</li>
          <li>Composition service called (native or external)</li>
          <li>Services composed into supergraph</li>
          <li>Validation errors checked</li>
          <li>If valid, supergraph stored</li>
          <li>If invalid, publish rejected with errors</li>
          <li>Client receives composition result</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Errors</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Common composition failures:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Missing @key directive on federated type</li>
          <li>Conflicting type definitions</li>
          <li>Invalid @requires/@provides usage</li>
          <li>External composition service unreachable</li>
          <li>Timeout waiting for composition</li>
          <li>Invalid SDL syntax</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL mutations and queries</li>
        <li>Form components - Settings configuration</li>
        <li>Table component - Token list</li>
        <li>Sheet - Token details drawer</li>
        <li>Badge - Permission indicators</li>
        <li>CodeEditor - External endpoint configuration</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Composition method per project type</li>
        <li>Native composition recommended for most cases</li>
        <li>External composition for custom logic</li>
        <li>Project tokens simpler than org tokens</li>
        <li>Target scoping for granular access</li>
        <li>Composition validation on publish</li>
        <li>Error messages guide fixing issues</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components configure project-level settings for
        schema composition and access tokens using GraphQL mutations. See actual usage in project
        settings pages.
      </p>
    </div>
  </div>
);
