import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/base/button/button';
import { Label } from '@/components/base/label/label';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { InputCopy } from '@/components/ui/input-copy';
import { Textarea } from './textarea';

export const nav: NavPath = 'Base/Primitives/Textarea/Component Examples';

/**
 * Every textarea in the app. Seven are form fields that differ only in copy; the other three
 * are a bare comment box and two growing fields. The pages cannot be imported: they mount
 * react-hook-form and run GraphQL, so each preview holds its value locally.
 *
 * History: `ui/textarea` until round 5, with an `autoSize` prop that swapped the element for
 * `react-textarea-autosize`. One call site used it; another wanted the same behaviour and reached
 * for the native `field-sizing: content` behind a ts-expect-error. `autoSize` is the native
 * property now, and the package is gone.
 */

const ENTRIES = [
  {
    source: 'pages/organization-support.tsx:205',
    origin: 'base',
    what: 'Support ticket description in a Sheet, raised, with a description below',
    coveredBy: 'Form field',
  },
  {
    source: 'members/roles.tsx:226, :490',
    origin: 'base',
    what: 'Role description in the create and edit dialogs, raised',
    coveredBy: 'Form field',
  },
  {
    source: 'the three create-*-access-token sheets',
    origin: 'base',
    what: 'Access token description, raised',
    coveredBy: 'Form field',
  },
  {
    source: 'pages/organization-support-ticket.tsx:94',
    origin: 'base',
    what: 'Reply box on the page, no label',
    coveredBy: 'Form field',
  },
  {
    source: 'pages/target-checks-single.tsx:251',
    origin: 'base',
    what: 'Approval comment, outside any Form',
    coveredBy: 'Bare comment box',
  },
  {
    source: 'pages/target-proposals-new.tsx:703',
    origin: 'base',
    what: 'Proposal description, autoSize from six rows',
    coveredBy: 'Growing',
  },
  {
    source: 'components/ui/input-copy.tsx:31',
    origin: 'base',
    what: 'Read-only autoSize mono field for copyable multi-line output',
    coveredBy: 'Growing',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/textarea"
      summary={
        <>
          The same field as Input, multi-line: the surface ladder, states and error handling are
          shared. <code>autoSize</code> is the one extra, and it is the native field sizing.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Form fields, on whichever surface their form sits.
// ---------------------------------------------------------------------------

export const FormField = createPreview({
  label: 'Form field',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization-support.tsx:205"
        origin="base"
        note="In the new-ticket sheet, so raised. Label, field, description, message."
      >
        <div className="bg-neutral-3 border-neutral-5 flex w-[28rem] flex-col gap-1.5 rounded-md border p-6">
          <Label htmlFor="ticket-description" label="Description" />
          <Textarea
            id="ticket-description"
            placeholder="Enter a short description of your issue"
            onSurface="raised"
          />
          <p className="text-neutral-11 text-xs">Help us understand it better.</p>
        </div>
      </CallSite>
      <CallSite
        source="members/roles.tsx:226, :490 and the three access-token sheets"
        origin="base"
        note="Five copies of the same raised field; the token sheets differ only in placeholder."
      >
        <div className="bg-neutral-3 border-neutral-5 flex w-[28rem] flex-col gap-1.5 rounded-md border p-6">
          <Label htmlFor="role-description" label="Description" />
          <Textarea
            id="role-description"
            placeholder="Enter a description"
            autoComplete="off"
            onSurface="raised"
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/organization-support-ticket.tsx:94"
        origin="base"
        note="On the page under the ticket thread, no label, the submit row beneath. The base surface."
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
// pages/target-checks-single.tsx:251, outside any Form.
// ---------------------------------------------------------------------------

export const BareCommentBox = createPreview({
  label: 'Bare comment box',
  render: () => <ApprovalComment />,
});

function ApprovalComment() {
  const [comment, setComment] = useState('');

  return (
    <CallSite
      source="pages/target-checks-single.tsx:251"
      origin="base"
      note="Controlled by hand. The placeholder has two spaces after the closing bracket, which is in the source."
    >
      <div className="w-[28rem] space-y-2">
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
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
// The two growing fields, on one mechanism.
// ---------------------------------------------------------------------------

export const Growing = createPreview({
  label: 'Growing',
  render: () => <GrowingFields />,
});

function GrowingFields() {
  const [description, setDescription] = useState('');

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/input-copy.tsx:31"
        origin="base"
        note="InputCopy in multiline mode: read-only, mono, auto-sized to its content, selects all on focus."
      >
        <InputCopy
          multiline
          value={
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\n.eyJzdWIiOiJ0YXJnZXQ6cHJvZHVjdGlvbiJ9\n.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1g'
          }
        />
      </CallSite>
      <CallSite
        source="pages/target-proposals-new.tsx:703"
        origin="base"
        note="Starts at six rows and grows with the text. Where a browser lacks field-sizing it keeps its rows and scrolls."
      >
        <div className="w-[28rem] pb-10">
          <Label htmlFor="proposal-description" label="Description" />
          <div className="mt-2">
            <Textarea
              aria-label="description"
              id="proposal-description"
              name="proposal-description"
              autoSize
              rows={6}
              value={description}
              onChange={e => setDescription(e.currentTarget.value)}
              maxLength={5000}
            />
          </div>
        </div>
      </CallSite>
    </div>
  );
}
