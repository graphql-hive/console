import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Textarea';

/**
 * Every `ui/textarea` call site. There is no v2 counterpart.
 *
 * Six of the nine are plain `Form` fields and are effectively identical. The interesting ones are
 * the three that are not: an `autoSize` read-only field for copyable output, a browser-native
 * `fieldSizing: content` field that bypasses `autoSize` entirely, and a bare comment box.
 *
 * The pages themselves cannot be imported: they mount react-hook-form and run GraphQL. Each
 * preview holds its value locally.
 */

const ENTRIES = [
  {
    source: 'pages/organization-support.tsx:205',
    origin: 'ui',
    what: 'Support ticket description, with a FormDescription below',
    coveredBy: 'Form field',
  },
  {
    source: 'pages/organization-support-ticket.tsx:94',
    origin: 'ui',
    what: 'Reply box, no label at all',
    coveredBy: 'Form field',
  },
  {
    source: 'components/organization/members/roles.tsx:229',
    origin: 'ui',
    what: 'Role description, autoComplete off',
    coveredBy: 'Form field',
  },
  {
    source: 'components/organization/members/roles.tsx:493',
    origin: 'ui',
    what: 'Same field in the edit form, props in the other order',
    coveredBy: 'Form field',
  },
  {
    source: 'create-access-token-sheet-content.tsx:257',
    origin: 'ui',
    what: 'Access token description',
    coveredBy: 'Form field',
  },
  {
    source: 'create-personal-access-token-sheet-content.tsx',
    origin: 'ui',
    what: 'Same field, personal tokens',
    coveredBy: 'Form field',
  },
  {
    source: 'create-project-access-token-sheet-content.tsx',
    origin: 'ui',
    what: 'Same field, project tokens',
    coveredBy: 'Form field',
  },
  {
    source: 'pages/target-checks-single.tsx:244',
    origin: 'ui',
    what: 'Approval comment, outside any Form',
    coveredBy: 'Bare comment box',
  },
  {
    source: 'pages/target-proposals-new.tsx:703',
    origin: 'ui',
    what: 'Proposal description using native fieldSizing rather than autoSize',
    coveredBy: 'Native field sizing',
  },
  {
    source: 'components/ui/input-copy.tsx:31',
    origin: 'ui',
    what: 'Read-only autoSize field for copyable multi-line output',
    coveredBy: 'Read-only autoSize',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/textarea"
      summary={
        <>
          <strong>10 instances, no v2 counterpart.</strong> Seven are plain <code>Form</code> fields
          with only their placeholder differing. The component offers an <code>autoSize</code> prop
          that swaps the element for <code>react-textarea-autosize</code>, and exactly one call site
          uses it. Another call site wants the same behaviour and reaches for the native CSS{' '}
          <code>fieldSizing: content</code> instead, behind a <code>@ts-expect-error</code> — so
          growing textareas are solved two ways, neither of them the default.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The default, and the two size behaviours.
// ---------------------------------------------------------------------------

export const Default = createPreview({
  label: 'Default',
  render: () => (
    <CallSite
      source="components/ui/textarea.tsx"
      origin="ui"
      note="min-h-[80px], filled bg-neutral-3, and it does not resize with its content unless autoSize is passed. Type into it to see that it just scrolls."
    >
      <div className="w-[28rem]">
        <Textarea placeholder="Placeholder" />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Seven near-identical Form fields. One preview covers them; only the copy differs.
// ---------------------------------------------------------------------------

export const FormFieldPreview = createPreview({
  label: 'Form field',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization-support.tsx:205"
        origin="ui"
        note="Label, field, description, message. The only one of the seven carrying a FormDescription."
      >
        <div className="flex w-[28rem] flex-col gap-1.5">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea placeholder="Enter a short description of your issue" />
          <p className="text-neutral-11 text-xs">Help us understand it better.</p>
        </div>
      </CallSite>
      <CallSite
        source="members/roles.tsx:229, :493 and the three access-token sheets"
        origin="ui"
        note="Five copies of the same field. roles.tsx has it twice with the props in a different order in each; the token sheets differ only in placeholder."
      >
        <div className="flex w-[28rem] flex-col gap-1.5">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea placeholder="Enter a description" autoComplete="off" />
        </div>
      </CallSite>
      <CallSite
        source="pages/organization-support-ticket.tsx:94"
        origin="ui"
        note="No label. It sits directly under the ticket thread, with the submit row beneath."
      >
        <div className="flex w-[28rem] flex-col gap-3">
          <Textarea placeholder="Type your comment here." />
          <div className="flex flex-row gap-x-4">
            <Button type="submit">Reply</Button>
            <Button variant="link" type="reset">
              Cancel
            </Button>
          </div>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-checks-single.tsx:244 — outside any Form.
// ---------------------------------------------------------------------------

export const BareCommentBox = createPreview({
  label: 'Bare comment box',
  render: () => <ApprovalComment />,
});

function ApprovalComment() {
  const [comment, setComment] = useState('');

  return (
    <CallSite
      source="pages/target-checks-single.tsx:244"
      origin="ui"
      note="No Form, no label, controlled by hand. Note the placeholder has two spaces after the closing bracket, which is in the source."
    >
      <div className="w-[28rem] space-y-2">
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full"
          placeholder="(Optional)  Add a comment..."
        />
        <div className="text-right">
          <Button variant="destructive">Approve</Button>
        </div>
      </div>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// The two growing-textarea solutions.
// ---------------------------------------------------------------------------

export const ReadOnlyAutoSize = createPreview({
  label: 'Read-only autoSize',
  render: () => (
    <CallSite
      source="components/ui/input-copy.tsx:31"
      origin="ui"
      note="The only autoSize call site. Read-only, font-mono, selects all on focus, and drops min-h to 0 so it hugs its content. Click it to see the select-on-focus."
    >
      <div className="flex w-full max-w-2xl items-center space-x-2">
        <Textarea
          value={
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\n.eyJzdWIiOiJ0YXJnZXQ6cHJvZHVjdGlvbiJ9\n.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1g'
          }
          readOnly
          autoSize
          onFocus={ev => ev.target.select()}
          className="bg-neutral-2 text-neutral-12 w-full resize-none font-mono text-xs"
        />
        <Button variant="outline">Copy</Button>
      </div>
    </CallSite>
  ),
});

export const NativeFieldSizing = createPreview({
  label: 'Native field sizing',
  render: () => <ProposalDescription />,
});

function ProposalDescription() {
  const [description, setDescription] = useState('');

  return (
    <CallSite
      source="pages/target-proposals-new.tsx:703"
      origin="ui"
      note="Wants the same growing behaviour as input-copy but does it with the native CSS fieldSizing: content, behind a @ts-expect-error because the React types do not know the property yet. Type several lines to compare it against the autoSize one above."
    >
      <div className="w-[28rem] pb-10">
        <Label className="p-1" htmlFor="proposal-description">
          Description
        </Label>
        <Textarea
          aria-label="description"
          id="proposal-description"
          name="proposal-description"
          // @ts-expect-error: fieldSizing does not exist on the current React types
          style={{ fieldSizing: 'content' }}
          className="mt-2 h-auto min-h-40 resize-none"
          value={description}
          onChange={e => setDescription(e.currentTarget.value)}
        />
      </div>
    </CallSite>
  );
}
