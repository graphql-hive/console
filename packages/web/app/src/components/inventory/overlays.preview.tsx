import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import { Select } from '@/components/base/floating/select/select';
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
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Sheet from '@/components/ui/sheet';
import { Input as V2Input } from '@/components/v2/input';
import { Modal } from '@/components/v2/modal';
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
    source:
      'create-alert.tsx:94, create-channel.tsx:112, user/settings.tsx:88, cdn-access-tokens.tsx:167 and :289, transfer-organization-ownership.tsx:171',
    origin: 'v2',
    what: '6 render sites: 1 sets size, 3 default, 2 override width with a className',
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
          namespace-imported in 12 files and named-imported in 11. <code>v2/modal</code> is the only
          one that solves portalling tooltips out of an overlay, and the only one with a named width
          scale — which two of its six call sites bypass anyway.
          <br />
          <br />
          <strong>Dead exports, delete rather than port:</strong> <code>DialogOverlay</code>,{' '}
          <code>DialogPortal</code>, <code>SheetClose</code>, <code>SheetOverlay</code>,{' '}
          <code>SheetPortal</code>, <code>AlertDialogPortal</code>, <code>AlertDialogOverlay</code>{' '}
          — zero call sites each. Same for Sheet&apos;s <code>noOverlay</code> prop and v2
          Modal&apos;s <code>trigger</code> prop.
          <br />
          <br />
          <strong>Triggers are the exception, not the rule.</strong> <code>DialogTrigger</code> 3,{' '}
          <code>SheetTrigger</code> 4, <code>AlertDialogTrigger</code> 2, against 27 Dialogs, 15
          Sheets and 7 AlertDialogs. The app controls overlays with <code>open</code> state and a
          button elsewhere, so a base API that leads with a trigger prop would be designing for the
          minority case.
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

export const V2ModalPreview = createPreview({
  label: 'v2 modal',
  render: () => <V2ModalExamples />,
});

function V2ModalExamples() {
  const [openAlert, setOpenAlert] = useState(false);
  const [openCdn, setOpenCdn] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/alerts/create-alert.tsx:94"
        origin="v2"
        note="The default: size sm (w-[450px]), bg-neutral-1 on a neutral-5/80 overlay, rounded-md, p-7. Compare the surface against the ui Dialog above: they do not read as the same system. Three Selects inside, each with its own label and error slot (base since round 3; they were v2 native selects)."
      >
        <Button variant="outline" onClick={() => setOpenAlert(true)}>
          Open create-alert modal
        </Button>
        <Modal open={openAlert} onOpenChange={setOpenAlert}>
          <form className="flex flex-col gap-8" onSubmit={e => e.preventDefault()}>
            <Heading className="text-center">Create an alert</Heading>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="name">
                Type
              </label>
              <Select
                name="type"
                placeholder="Select alert type"
                options={[
                  { value: 'SCHEMA_CHANGE_NOTIFICATIONS', label: 'Schema Change Notifications' },
                ]}
                width="full"
              />
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="name">
                Channel
              </label>
              <Select
                name="channel"
                placeholder="Select channel"
                options={[
                  { value: 'c1', label: 'Slack #alerts' },
                  { value: 'c2', label: 'Webhook' },
                ]}
                width="full"
              />
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="name">
                Target
              </label>
              <Select
                name="target"
                placeholder="Select target"
                options={[
                  { value: 'production', label: 'production' },
                  { value: 'staging', label: 'staging' },
                ]}
                width="full"
              />
            </div>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                size="lg"
                className="w-full justify-center"
                onClick={() => setOpenAlert(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" className="w-full justify-center" variant="primary">
                Create Alert
              </Button>
            </div>
          </form>
        </Modal>
      </CallSite>

      <CallSite
        source="components/target/settings/cdn-access-tokens.tsx:167"
        origin="v2"
        note='The source passes a bare `open` and lets the parent mount or unmount it; a button stands in for that here. It overrides the size scale with className="w-[650px]", a width that is not on the scale at all. Two of the six v2 modals do this.'
      >
        <Button variant="outline" onClick={() => setOpenCdn(true)}>
          Open CDN token modal
        </Button>
        <Modal open={openCdn} className="w-[650px]" onOpenChange={setOpenCdn}>
          <form
            className="flex flex-1 flex-col items-stretch gap-12"
            onSubmit={e => e.preventDefault()}
          >
            <div className="flex flex-col gap-5">
              <Heading className="text-center">Create CDN Access Token</Heading>
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="alias">
                CDN Access Token Alias
              </label>
              <V2Input placeholder="Alias" name="alias" />
            </div>
            <div className="mt-auto flex w-full gap-2 self-end">
              <Button variant="secondary" className="ml-auto" onClick={() => setOpenCdn(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Modal>
      </CallSite>

      <CallSite
        source="components/v2/modals/transfer-organization-ownership.tsx:171"
        origin="v2"
        note="The only call site that passes size (lg, w-[800px]), and it still adds a className for layout. The real body is a Headless UI Combobox for picking the new owner; a v2 Input stands in for it here since Headless UI is its own migration."
      >
        <Button variant="outline" onClick={() => setOpenTransfer(true)}>
          Open transfer-ownership modal
        </Button>
        <Modal
          open={openTransfer}
          onOpenChange={setOpenTransfer}
          size="lg"
          className="flex flex-col gap-5"
        >
          <Heading>Transfer ownership</Heading>
          <p>Transferring is completed after the new owner approves the transfer.</p>
          <div className="flex flex-col gap-2">
            <div className="font-bold">New owner</div>
            <V2Input placeholder="Search by name or email" />
          </div>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              size="lg"
              className="w-full justify-center"
              onClick={() => setOpenTransfer(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="w-full justify-center" variant="primary">
              Transfer this organization
            </Button>
          </div>
        </Modal>
      </CallSite>
    </div>
  );
}
