import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Sheet from '@/components/ui/sheet';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Overlays';

/**
 * `ui/dialog`, `ui/sheet`, `ui/alert-dialog` and `v2/modal` — four components over one Radix
 * primitive, all shipping at once.
 *
 * Every preview here opens its overlay with a trigger button rather than rendering it open, since
 * a modal that is always open cannot show its overlay, its focus trap or its close affordance.
 * Click through each one.
 *
 * The pages cannot be imported: they run GraphQL mutations and mount react-hook-form. Each
 * preview holds open state locally.
 */

const ENTRIES = [
  {
    source: 'components/target/laboratory/create-operation-modal.tsx:186 and ~15 more',
    origin: 'ui',
    what: 'Dialog with a form inside, width overridden per call site',
    coveredBy: 'Dialog',
  },
  {
    source: 'components/ui/prompt.tsx',
    origin: 'ui',
    what: 'Dialog driven imperatively by a promise-based prompt manager',
    coveredBy: 'Dialog',
  },
  {
    source: 'components/ui/command.tsx',
    origin: 'ui',
    what: 'CommandDialog, a Dialog wrapping the cmdk palette',
    coveredBy: 'Dialog',
  },
  {
    source: 'components/organization/members/list.tsx:216 and 6 more',
    origin: 'ui',
    what: 'Destructive confirmation, content mounted only while open',
    coveredBy: 'Alert dialog',
  },
  {
    source: 'oidc-integration-configuration.tsx:606',
    origin: 'ui',
    what: 'AlertDialogTrigger wrapping a Switch rather than a button',
    coveredBy: 'Alert dialog',
  },
  {
    source: 'manage-group-mapping-sheet.tsx:115 and 11 more',
    origin: 'ui',
    what: 'Namespace import, so parts read Sheet.SheetContent',
    coveredBy: 'Sheet',
  },
  {
    source: 'create-access-token-sheet-content.tsx and the other token sheets',
    origin: 'ui',
    what: 'Right-side sheet holding a multi-step form',
    coveredBy: 'Sheet',
  },
  {
    source: 'components/ui/sidebar.tsx',
    origin: 'ui',
    what: 'Sheet used as the mobile sidebar, side=left',
    coveredBy: 'Sheet',
  },
  {
    source: 'components/target/laboratory/connect-lab-modal.tsx and 5 more',
    origin: 'v2',
    what: 'Modal with sm/md/lg width sizes and a trigger prop',
    coveredBy: 'v2 modal',
  },
  {
    source: 'components/v2/modal.tsx:26',
    origin: 'v2',
    what: 'Supplies ModalTooltipContext so tooltips inside portal correctly',
    coveredBy: 'v2 modal',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/dialog, ui/sheet, ui/alert-dialog and v2/modal"
      summary={
        <>
          <strong>Four components over one Radix primitive.</strong> <code>ui/dialog</code> (22
          instances), <code>ui/sheet</code> (23 files), <code>ui/alert-dialog</code> (7) and{' '}
          <code>v2/modal</code> (6) all wrap <code>@radix-ui/react-dialog</code>, and they disagree
          on nearly everything: fill (<code>neutral-3</code> vs <code>neutral-1</code>), radius,
          padding, how width is set, and whether a close button is opt-in or opt-out. Sheet is
          namespace-imported in 12 files and named-imported in 11. Only <code>v2/modal</code> solves
          portalling tooltips out of an overlay.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// ui/dialog — centred, max-w-lg by default, close button unless hideCloseButton.
// ---------------------------------------------------------------------------

export const DialogPreview = createPreview({
  label: 'Dialog',
  render: () => <DialogExamples />,
});

function DialogExamples() {
  const [openForm, setOpenForm] = useState(false);
  const [openPlain, setOpenPlain] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/laboratory/create-operation-modal.tsx:186"
        origin="ui"
        note="bg-neutral-3, centred by translate, sm:rounded-lg, p-6. The default max-w-lg is overridden here to w-4/5 max-w-[600px] md:w-3/5, which is one of many bespoke widths."
      >
        <Button variant="outline" onClick={() => setOpenForm(true)}>
          Open create-operation dialog
        </Button>
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogContent className="w-4/5 max-w-[600px] md:w-3/5" data-cy="create-operation-modal">
            <form className="space-y-8">
              <DialogHeader>
                <DialogTitle>Create Operation</DialogTitle>
                <DialogDescription>
                  Create a new operation and add it to a collection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Operation name</Label>
                  <Input placeholder="My operation" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Collection</Label>
                  <Input placeholder="Select a Collection" readOnly />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" size="lg" className="w-full justify-center">
                  Add operation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CallSite>

      <CallSite
        source="components/ui/prompt.tsx"
        origin="ui"
        note="The default width, no override. Driven imperatively: usePromptManager() returns a promise, so there is no JSX trigger anywhere in the app for this one."
      >
        <Button variant="outline" onClick={() => setOpenPlain(true)}>
          Open prompt dialog
        </Button>
        <Dialog open={openPlain} onOpenChange={setOpenPlain}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save operation</DialogTitle>
              <DialogDescription>Enter a name for this operation.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Operation name" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPlain(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpenPlain(false)}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ui/alert-dialog — destructive confirmations. Seven call sites, all the same shape.
// ---------------------------------------------------------------------------

export const AlertDialogPreview = createPreview({
  label: 'Alert dialog',
  render: () => <AlertDialogExample />,
});

function AlertDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <CallSite
      source="components/organization/members/list.tsx:216"
      origin="ui"
      note="Note the `{open ? <AlertDialogContent> : null}` guard: the content is only mounted while open, so it does not run its subtree on every render. Six of the seven call sites do this. No close button - Cancel and Action are the only ways out."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Delete member
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        {open ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{' '}
                <strong>user@the-guild.dev</strong> from the organization.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// ui/sheet — four sides, right by default. Namespace-imported in 12 of 23 files.
// ---------------------------------------------------------------------------

export const SheetPreview = createPreview({
  label: 'Sheet',
  render: () => <SheetExamples />,
});

function SheetExamples() {
  const [openRight, setOpenRight] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/members/groups/manage-group-mapping-sheet.tsx:115"
        origin="ui"
        note="Namespace style, so every part is Sheet.SheetContent and so on. Right side, w-3/4 capped at sm:max-w-sm, bg-neutral-3, p-6, with its own close button top-right. Title takes a node, not a string - this one embeds a Badge."
      >
        <Button variant="outline" onClick={() => setOpenRight(true)}>
          Open group-mapping sheet
        </Button>
        <Sheet.Sheet open={openRight} onOpenChange={setOpenRight}>
          <Sheet.SheetContent>
            <Sheet.SheetHeader>
              <Sheet.SheetTitle>
                Add new group role mapping to <Badge content="platform" />
              </Sheet.SheetTitle>
              <Sheet.SheetDescription>
                Assign a role with permissions to the group role.
              </Sheet.SheetDescription>
            </Sheet.SheetHeader>
            <div className="flex flex-col gap-1.5 py-4">
              <Label>Role</Label>
              <Input placeholder="Select role" readOnly />
            </div>
            <Sheet.SheetFooter>
              <Button variant="outline" onClick={() => setOpenRight(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpenRight(false)}>Save</Button>
            </Sheet.SheetFooter>
          </Sheet.SheetContent>
        </Sheet.Sheet>
      </CallSite>

      <CallSite
        source="components/ui/sidebar.tsx"
        origin="ui"
        note="side='left', the only non-default side in the app. The sidebar uses it as its mobile drawer."
      >
        <Button variant="outline" onClick={() => setOpenLeft(true)}>
          Open left sheet
        </Button>
        <Sheet.Sheet open={openLeft} onOpenChange={setOpenLeft}>
          <Sheet.SheetContent side="left">
            <Sheet.SheetHeader>
              <Sheet.SheetTitle>Navigation</Sheet.SheetTitle>
              <Sheet.SheetDescription>Mobile sidebar drawer.</Sheet.SheetDescription>
            </Sheet.SheetHeader>
          </Sheet.SheetContent>
        </Sheet.Sheet>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v2/modal — the only overlay with a size scale, and the only one that solves portalled tooltips.
// ---------------------------------------------------------------------------

export const V2ModalNotes = createPreview({
  label: 'v2 modal',
  render: () => (
    <div className="flex max-w-3xl flex-col gap-4 text-sm">
      <p className="text-neutral-11">
        <code>v2/modal</code> is not rendered here: it mounts a Radix <code>TooltipProvider</code>{' '}
        and a <code>ModalTooltipContext</code> around its content, and reproducing that faithfully
        means reproducing the tooltip plumbing it exists for. Its source is{' '}
        <code>components/v2/modal.tsx</code>. What matters for the migration:
      </p>
      <ul className="text-neutral-11 flex flex-col gap-3">
        <li>
          <strong className="text-neutral-12">A size scale, not a className.</strong>{' '}
          <code>sm</code> is <code>w-[450px]</code>, <code>md</code> <code>w-[600px]</code>,{' '}
          <code>lg</code> <code>w-[800px]</code>. It is the only one of the four that names its
          widths instead of leaving each call site to invent one.
        </li>
        <li>
          <strong className="text-neutral-12">A different surface.</strong>{' '}
          <code>bg-neutral-1</code> against ui/dialog&apos;s <code>bg-neutral-3</code>, a{' '}
          <code>neutral-5/80</code> overlay, <code>rounded-md</code> and <code>p-7</code>. Two
          modals open side by side would not look related.
        </li>
        <li>
          <strong className="text-neutral-12">A trigger prop.</strong> It takes <code>trigger</code>{' '}
          as a prop rather than a <code>Trigger</code> child, which is already the props-based shape
          base wants.
        </li>
        <li>
          <strong className="text-neutral-12">ModalTooltipContext.</strong> It captures its content
          ref and publishes it, so a tooltip inside the modal portals into the modal rather than to{' '}
          <code>&lt;body&gt;</code> behind the overlay. <code>base/floating</code> already solves
          this with <code>FloatingPortalContainerProvider</code>, so the context is replaced rather
          than ported.
        </li>
      </ul>
    </div>
  ),
});
