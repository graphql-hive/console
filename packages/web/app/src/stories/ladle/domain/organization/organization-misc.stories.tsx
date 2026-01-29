import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Organization / Miscellaneous',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Organization Miscellaneous Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Additional organization-level components including permissions management, usage tracking,
        support ticketing, Stripe integration utilities, and OIDC SSO configuration.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Permissions.tsx - Organization permissions page</li>
        <li>Usage.tsx - Usage analytics and statistics</li>
        <li>support.tsx - Support ticket management</li>
        <li>stripe.tsx - Stripe integration helpers</li>
        <li>oidc-integration-section.tsx - SSO/OIDC configuration</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Permissions Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Organization-wide permissions page:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Overview of who can do what</li>
          <li>Matrix view: Members × Permissions</li>
          <li>Role-based grouping</li>
          <li>Permission audit view</li>
          <li>Export permissions report</li>
          <li>Quick links to manage members/roles</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Usage analytics dashboard:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Total operations this month</li>
          <li>Schema checks count</li>
          <li>Active members</li>
          <li>API requests</li>
          <li>Usage timeline chart</li>
          <li>Breakdown by project/target</li>
          <li>Compared to plan limits</li>
          <li>Historical usage trends</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Charts and visualizations:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Operations timeline (line chart)</li>
          <li>Usage by project (pie chart)</li>
          <li>Daily/weekly/monthly views</li>
          <li>Export to CSV option</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Support Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Support ticket management:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Create support ticket button</li>
          <li>Ticket form with priority selection</li>
          <li>Subject and description fields</li>
          <li>File attachment support</li>
          <li>Ticket list table</li>
          <li>Status badges (Open, In Progress, Resolved)</li>
          <li>Priority indicators (Low, Medium, High, Critical)</li>
          <li>Click ticket to view details and replies</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Ticket details:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Ticket thread (messages)</li>
          <li>Reply to ticket</li>
          <li>Close ticket button</li>
          <li>Reopen closed ticket</li>
          <li>Support agent assignment</li>
          <li>SLA timer (Enterprise plan)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Stripe Integration Utilities</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Helper functions and components:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>getIsStripeEnabled() - Check if Stripe configured</li>
          <li>Stripe public key loading</li>
          <li>Stripe script injection</li>
          <li>Customer portal link generation</li>
          <li>Checkout session creation</li>
          <li>Webhook signature verification helpers</li>
          <li>Error handling utilities</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">OIDC Integration Section</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">SSO/OIDC configuration (Enterprise feature):</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Enable/disable OIDC toggle</li>
          <li>OIDC provider selection (Okta, Auth0, etc.)</li>
          <li>Client ID input</li>
          <li>Client Secret input (masked)</li>
          <li>Discovery endpoint URL</li>
          <li>Redirect URI display (copy-able)</li>
          <li>Test connection button</li>
          <li>Auto-provisioning settings</li>
          <li>Role mapping configuration</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">OIDC Setup Flow</h4>
      <div className="space-y-2">
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Navigate to Settings → SSO</li>
          <li>Enable OIDC integration</li>
          <li>Enter OIDC provider details (Client ID, Secret, etc.)</li>
          <li>Copy Redirect URI to OIDC provider config</li>
          <li>Test connection</li>
          <li>Configure auto-provisioning (optional)</li>
          <li>Map OIDC groups to Hive roles</li>
          <li>Save configuration</li>
          <li>Users can now login via SSO</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Auto-Provisioning</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">When enabled:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>New SSO users automatically added to org</li>
          <li>Default role assigned</li>
          <li>Group-based role mapping</li>
          <li>Email domain restrictions</li>
          <li>Just-in-time (JIT) provisioning</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Role Mapping Example</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`OIDC Groups → Hive Roles:
engineering    → Developer
admin          → Admin
viewer         → Viewer
support        → Support (custom role)

Default role (if no group match): Viewer`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Statistics Tracked</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Metrics:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Total GraphQL operations executed</li>
          <li>Schema publishes/checks</li>
          <li>API requests (GraphQL API)</li>
          <li>Active users (MAU)</li>
          <li>Projects/targets created</li>
          <li>Laboratory queries run</li>
          <li>CDN requests</li>
          <li>Storage used (schemas, artifacts)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Support Ticket Priorities</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">Low</code>
          <span className="text-neutral-11 text-xs">- General questions, feature requests</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Medium</code>
          <span className="text-neutral-11 text-xs">- Minor bugs, non-blocking issues</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">High</code>
          <span className="text-neutral-11 text-xs">- Major bugs affecting functionality</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">Critical</code>
          <span className="text-neutral-11 text-xs">- Service down, data loss</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateSupportTicket - Create new ticket</li>
        <li>ReplyToTicket - Add reply/comment</li>
        <li>CloseTicket - Mark ticket as resolved</li>
        <li>ReopenTicket - Reopen closed ticket</li>
        <li>ConfigureOIDC - Save OIDC settings</li>
        <li>TestOIDCConnection - Validate OIDC config</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>OrganizationPermissions - Permission matrix</li>
        <li>OrganizationUsage - Usage statistics</li>
        <li>SupportTickets - List tickets</li>
        <li>SupportTicket - Single ticket details</li>
        <li>OIDCConfiguration - Current OIDC settings</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL queries and mutations</li>
        <li>@stripe/stripe-js - Stripe client SDK</li>
        <li>Chart library - Usage visualizations</li>
        <li>Table component - Tickets/permissions lists</li>
        <li>Form components - OIDC configuration</li>
        <li>Badge - Status indicators</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Permissions page for audit and compliance</li>
        <li>Usage tracking for billing and limits</li>
        <li>Support tickets for customer service</li>
        <li>Stripe utilities shared across billing components</li>
        <li>OIDC for enterprise SSO authentication</li>
        <li>Auto-provisioning reduces admin overhead</li>
        <li>Role mapping bridges OIDC groups to Hive roles</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components handle organization settings, usage
        tracking, support, and SSO configuration with GraphQL and external integrations. See actual
        usage in organization pages.
      </p>
    </div>
  </div>
);
