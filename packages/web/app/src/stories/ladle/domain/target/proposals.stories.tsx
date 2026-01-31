import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Proposals',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Target Proposals Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Schema proposal workflow components for reviewing, approving, and managing schema changes
        before they're published. Includes proposal editor, review interface, schema diff viewer,
        and various filters.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Component Files</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>index.tsx - Main proposals list and overview</li>
        <li>Review.tsx - Proposal review interface with approval/rejection</li>
        <li>editor.tsx - Schema proposal editor</li>
        <li>change-detail.tsx - Detailed view of schema changes</li>
        <li>schema-diff/ - Schema diff viewer components</li>
        <li>service-heading.tsx - Service/subgraph heading display</li>
        <li>stage-filter.tsx - Filter by proposal stage</li>
        <li>stage-transition-select.tsx - Change proposal stage</li>
        <li>user-filter.tsx - Filter by proposal author</li>
        <li>version-select.tsx - Schema version selector</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Proposal Workflow</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Stages:</p>
        <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
          <li>Draft - Proposal being written</li>
          <li>In Review - Submitted for team review</li>
          <li>Approved - Ready to publish</li>
          <li>Rejected - Not accepted</li>
          <li>Published - Schema changes applied</li>
        </ol>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Proposals List (index.tsx)</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Table of all schema proposals</li>
          <li>Columns: Title, Author, Stage, Created, Updated</li>
          <li>Filters: stage, author, date range</li>
          <li>Create new proposal button</li>
          <li>Click row to view proposal details</li>
          <li>Stage badges with color coding</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Review Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Proposal title and description</li>
          <li>Author and created date</li>
          <li>Current stage indicator</li>
          <li>Schema diff viewer</li>
          <li>Breaking changes highlighted</li>
          <li>Comment thread for discussion</li>
          <li>Approve/Reject buttons (for reviewers)</li>
          <li>Publish button (when approved)</li>
          <li>Stage transition dropdown</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Proposal Editor</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Form fields:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Proposal title (required)</li>
          <li>Description (Markdown supported)</li>
          <li>Schema changes (GraphQL SDL)</li>
          <li>Target schema version base</li>
          <li>Live diff preview as you type</li>
          <li>Breaking change warnings</li>
          <li>Save as draft or submit for review</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Schema Diff Viewer</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Features (schema-diff/):</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Side-by-side or unified diff view</li>
          <li>Added types/fields in green</li>
          <li>Removed types/fields in red</li>
          <li>Modified types/fields in yellow</li>
          <li>Breaking changes highlighted with warning</li>
          <li>Grouping by type kind (Object, Interface, etc.)</li>
          <li>Expandable/collapsible sections</li>
          <li>Line-by-line SDL comparison</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Change Detail Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Displays:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Change type (ADD, REMOVE, MODIFY)</li>
          <li>Affected type/field name</li>
          <li>Before/after comparison</li>
          <li>Breaking change indicator</li>
          <li>Impact analysis (affected queries)</li>
          <li>Deprecation notices</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Service Heading</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For federated schemas:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Displays subgraph/service name</li>
          <li>Service metadata tags</li>
          <li>Shows which service owns changes</li>
          <li>Expandable service details</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Stage Filter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<StageFilter
  currentStage="in_review"
  onChange={(stage) => {}}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Options:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>All - Show all proposals</li>
          <li>Draft - Only drafts</li>
          <li>In Review - Under review</li>
          <li>Approved - Approved proposals</li>
          <li>Rejected - Rejected proposals</li>
          <li>Published - Already published</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Stage Transition Select</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<StageTransitionSelect
  currentStage="draft"
  proposalId="proposal-id"
  onTransition={() => {}}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Valid transitions:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Draft → In Review (submit)</li>
          <li>In Review → Approved (approve)</li>
          <li>In Review → Rejected (reject)</li>
          <li>Approved → Published (publish)</li>
          <li>Any → Draft (back to draft)</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">User Filter</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`<UserFilter
  selectedUserId="user-id"
  users={[...]}
  onChange={(userId) => {}}
/>`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Filters proposals by:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Proposal author</li>
          <li>All users option</li>
          <li>Current user option</li>
          <li>Dropdown with user list</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Version Select</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Select base schema version for proposal:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Dropdown of schema versions</li>
          <li>Shows version ID and commit</li>
          <li>Latest version highlighted</li>
          <li>Updates diff when changed</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Breaking Changes Detection</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Automatically detects:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Removed types or fields</li>
          <li>Changed field types (incompatible)</li>
          <li>Removed enum values</li>
          <li>Added required arguments</li>
          <li>Changed argument types</li>
          <li>Removed interfaces from types</li>
          <li>Warning badges on breaking changes</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Mutations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>CreateSchemaProposal - Create new proposal</li>
        <li>UpdateSchemaProposal - Edit proposal</li>
        <li>DeleteSchemaProposal - Remove proposal</li>
        <li>TransitionProposalStage - Change stage</li>
        <li>ApproveSchemaProposal - Approve for publishing</li>
        <li>RejectSchemaProposal - Reject proposal</li>
        <li>PublishSchemaProposal - Apply changes to schema</li>
        <li>CommentOnProposal - Add review comment</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL queries and mutations</li>
        <li>Diff library - Schema comparison</li>
        <li>Markdown renderer - Proposal descriptions</li>
        <li>GraphQL parser - SDL validation</li>
        <li>@tanstack/react-router - Navigation</li>
        <li>Date picker - Filter by date range</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Proposal-based workflow prevents accidental breaking changes</li>
        <li>Team review process before publishing</li>
        <li>Automatic breaking change detection</li>
        <li>Stage-based permissions (draft vs approved)</li>
        <li>Comment threads for discussion</li>
        <li>Markdown support for rich descriptions</li>
        <li>Schema diff with syntax highlighting</li>
        <li>Federation-aware change analysis</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components implement complex schema proposal
        workflows with GraphQL mutations, diff algorithms, and review processes. See actual usage in
        target proposals pages.
      </p>
    </div>
  </div>
);
