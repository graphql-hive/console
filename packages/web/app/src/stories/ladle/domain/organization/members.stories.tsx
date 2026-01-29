import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Organization / Members',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Organization Members Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Team member management components including member list, invitations, role assignments, and
        granular permission configuration. Supports both simple and advanced permission models.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Members Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>list.tsx - Members table with role and status</li>
        <li>invitations.tsx - Pending invitations management</li>
        <li>roles.tsx - Role management (create/edit/delete)</li>
        <li>permission-selector.tsx - Granular permission picker</li>
        <li>member-role-picker.tsx - Role assignment dropdown</li>
        <li>member-role-selector.tsx - Role selection UI</li>
        <li>resource-selector.tsx - Resource-specific permissions</li>
        <li>selected-permission-overview.tsx - Permission summary display</li>
        <li>common.tsx - Shared utilities and types</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Members List</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Name (with avatar)
- Email
- Role (Admin, Developer, Viewer, or custom)
- Joined (date)
- Status (Active, Invited, Pending)
- Actions (Edit, Remove)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Sortable by name, email, joined date</li>
          <li>Filter by role</li>
          <li>Search by name/email</li>
          <li>Invite member button</li>
          <li>Bulk actions (coming soon)</li>
          <li>Member count in header</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Member Invitations</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Invitation flow:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Admin enters email and selects role</li>
          <li>System sends invitation email</li>
          <li>Invitation appears in pending list</li>
          <li>User clicks link in email</li>
          <li>User signs up/logs in</li>
          <li>Invitation auto-accepted, user joins org</li>
        </ol>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Pending invitations table:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Email address</li>
          <li>Role assigned</li>
          <li>Invited by (admin name)</li>
          <li>Sent date</li>
          <li>Resend invitation button</li>
          <li>Cancel invitation button</li>
          <li>Expiry after 7 days</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Roles Management</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Built-in roles:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Admin - Full organization access</li>
          <li>Developer - Create/manage projects and targets</li>
          <li>Viewer - Read-only access</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Custom roles:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Create custom role button</li>
          <li>Role name input</li>
          <li>Description field</li>
          <li>Permission selector (checkboxes)</li>
          <li>Resource scope selector</li>
          <li>Save role</li>
          <li>Assign to members</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Permission Selector</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Permission categories:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Organization - View, modify, delete</li>
          <li>Projects - Create, view, modify, delete</li>
          <li>Targets - Create, view, modify, delete</li>
          <li>Schema - Publish, check, delete</li>
          <li>Members - View, invite, manage</li>
          <li>Billing - View, modify</li>
          <li>Settings - View, modify</li>
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">UI components:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Grouped checkboxes by category</li>
          <li>Select all / deselect all per category</li>
          <li>Permission descriptions on hover</li>
          <li>Dependency indicators (some require others)</li>
          <li>Search filter for permissions</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Member Role Picker</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<MemberRolePicker
  currentRole="developer"
  roles={[...]}  // Built-in + custom roles
  onChange={(roleId) => {}}
  memberId="member-id"
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Dropdown menu with all roles</li>
          <li>Role name and description preview</li>
          <li>Current role highlighted</li>
          <li>Updates member role on selection</li>
          <li>Confirmation for downgrading admins</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Resource Selector</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Scope permissions to specific resources:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>All projects (organization-wide)</li>
          <li>Specific projects (multi-select)</li>
          <li>All targets in project</li>
          <li>Specific targets</li>
          <li>Tree view for org → project → target hierarchy</li>
          <li>Checkboxes for selection</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Selected Permission Overview</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Summary display:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Role badge (if using role)</li>
          <li>Custom permission count</li>
          <li>Grouped permission list</li>
          <li>Resource scope indicators</li>
          <li>Effective permissions calculation</li>
          <li>Permission inheritance from role</li>
          <li>Expandable sections per category</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Permission Model</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Permission {
  resource: "organization" | "project" | "target";
  action: "read" | "write" | "delete" | "create";
  scope?: {
    projects?: string[];  // Specific project IDs
    targets?: string[];   // Specific target IDs
  };
}

// Examples:
{ resource: "project", action: "create" }  // Can create projects
{ resource: "target", action: "write", scope: { targets: ["prod"] } }  // Edit prod target only`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Role Assignment Flow</h4>
      <div className="space-y-2">
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Select member from list</li>
          <li>Click "Change Role" button</li>
          <li>Role picker modal opens</li>
          <li>Select new role or customize permissions</li>
          <li>Preview permission changes</li>
          <li>Confirm assignment</li>
          <li>Member's role updates immediately</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>InviteMember - Send invitation email</li>
        <li>RemoveMember - Remove from organization</li>
        <li>UpdateMemberRole - Change member role</li>
        <li>CancelInvitation - Cancel pending invitation</li>
        <li>ResendInvitation - Resend invitation email</li>
        <li>CreateRole - Create custom role</li>
        <li>UpdateRole - Edit role permissions</li>
        <li>DeleteRole - Remove custom role</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>OrganizationMembers - List all members</li>
        <li>PendingInvitations - List pending invitations</li>
        <li>OrganizationRoles - List all roles (built-in + custom)</li>
        <li>MemberPermissions - Get member's effective permissions</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Permission Enforcement</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Frontend:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Hide UI elements user can't access</li>
          <li>Disable buttons for insufficient permissions</li>
          <li>Show permission tooltips on hover</li>
        </ul>
        <p className="text-neutral-11 text-xs">Backend:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>GraphQL directive @requiresPermission</li>
          <li>Resolver-level permission checks</li>
          <li>Scope validation for resource access</li>
          <li>Error messages for denied actions</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL queries and mutations</li>
        <li>Table component - Member list</li>
        <li>Modal/Sheet - Role picker and editors</li>
        <li>Checkbox - Permission selector</li>
        <li>Dropdown - Role selection</li>
        <li>Badge - Status and role indicators</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Role-based access control (RBAC)</li>
        <li>Granular permissions for advanced scenarios</li>
        <li>Resource-scoped permissions (project/target level)</li>
        <li>Invitation-based member addition</li>
        <li>Custom roles for flexible team structure</li>
        <li>Permission inheritance from roles</li>
        <li>Real-time permission updates</li>
        <li>Audit log for permission changes (future)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components manage team members and permissions
        using GraphQL mutations and complex permission logic. See actual usage in organization
        members pages. Note: selected-permission-overview.tsx already has a working story file.
      </p>
    </div>
  </div>
);
