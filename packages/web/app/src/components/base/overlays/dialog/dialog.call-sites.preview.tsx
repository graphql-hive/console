import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { useForm } from 'react-hook-form';
import { CallSite } from '@/components/inventory/shared';
import {
  OperationForm,
  OperationFormSchema,
  type OperationFormValues,
} from '@/components/target/laboratory/operation-form';
import { Button } from '@/components/base/button/button';
import { Callout } from '@/components/ui/callout';
import { InputCopy } from '@/components/ui/input-copy';
import type { DocumentCollectionOperation } from '@/lib/hooks/laboratory/use-collections';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select } from '../../floating/select/select';
import { Input } from '../../input/input';
import { Dialog } from './dialog';

export const nav: NavPath = 'Base/Overlays/Dialog/Component Examples';

/**
 * Every dialog shape in the app on base Dialog, one preview per shape with the call sites it
 * stands for. The pages mount forms and mutations, so state is local here and a submit only
 * closes. Kept as the regression fixture for the overlay family; the Sheet and AlertDialog
 * examples cover the other two.
 */

const COLLECTIONS = [
  { id: 'c1', name: 'Checkout', description: 'Cart and payment operations' },
  { id: 'c2', name: 'Smoke tests', description: 'Run after every deploy' },
] as unknown as DocumentCollectionOperation[];

// ---------------------------------------------------------------------------
// A form in the body, its submit in the footer
// ---------------------------------------------------------------------------

export const FormInBody = createPreview({
  label: 'Form in the body',
  render: () => <CreateOperationExample />,
});

function CreateOperationExample() {
  const [open, setOpen] = useState(false);
  const form = useForm<OperationFormValues>({
    resolver: zodResolver(OperationFormSchema),
    defaultValues: { name: '', collectionId: '' },
  });
  return (
    <CallSite
      source="target/laboratory/create-operation-modal.tsx:179 (stands for the edit operation, create collection, create project, create target, create alert, create channel, CDN token, profile settings and schema contract forms)"
      origin="base"
      note="The form carries an id and the footer's submit points at it through the form attribute, so the actions sit in the footer without living inside the form. Width lg, every control raised. Where an e2e helper scopes the submit through the form, the buttons stay inside it instead: the registry token and create project dialogs."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open create-operation dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        width="lg"
        attrs={{ 'data-cy': 'create-operation-modal' }}
        title="Create Operation"
        description="Create a new operation and add it to a collection"
        footer={
          <>
            <Button type="button" variant="outline" width="full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-operation-form" width="full" onSurface="raised">
              Add Operation
            </Button>
          </>
        }
      >
        <OperationForm
          form={form}
          id="create-operation-form"
          collections={COLLECTIONS}
          onSubmit={() => setOpen(false)}
        />
      </Dialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// A question that can only be answered
// ---------------------------------------------------------------------------

export const Prompt = createPreview({
  label: 'Prompt',
  render: () => <PromptExample />,
});

function PromptExample() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  return (
    <CallSite
      source="ui/prompt.tsx:36"
      origin="base"
      note="No close button and no backdrop dismissal, so it can only be answered; Escape counts as Cancel. Driven by usePromptManager(), which returns a promise to a preflight script, so there is no JSX trigger in the app."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open prompt
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!next) setOpen(false);
        }}
        closeButton={false}
        dismissible={false}
        title="Enter your username"
        attrs={{ 'data-cy': 'prompt' }}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="prompt-form" onSurface="raised">
              OK
            </Button>
          </>
        }
      >
        <form
          id="prompt-form"
          onSubmit={event => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <Input value={value} onChange={e => setValue(e.target.value)} onSurface="raised" />
        </form>
      </Dialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Selects inside a dialog
// ---------------------------------------------------------------------------

export const SelectsInside = createPreview({
  label: 'Selects inside',
  render: () => <CreateAlertExample />,
});

function CreateAlertExample() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('SCHEMA_CHANGE_NOTIFICATIONS');
  const [channel, setChannel] = useState('');
  const [target, setTarget] = useState('');
  return (
    <CallSite
      source="project/alerts/create-alert.tsx:97 (stands for create-channel.tsx and the CDN access token dialog)"
      origin="base"
      note="Three raised Selects with plain labels. Their popups render inside the dialog: the popup publishes itself as the portal container, and Base UI makes everything outside the dialog inert."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open create-alert dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create an alert"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-alert-form" onSurface="raised">
              Create Alert
            </Button>
          </>
        }
      >
        <form
          id="create-alert-form"
          className="flex flex-col gap-6"
          onSubmit={event => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="type">
              Type
            </label>
            <Select
              id="type"
              name="type"
              placeholder="Select alert type"
              options={[
                { value: 'SCHEMA_CHANGE_NOTIFICATIONS', label: 'Schema Change Notifications' },
              ]}
              value={type}
              onValueChange={setType}
              width="full"
              onSurface="raised"
            />
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="channel">
              Channel
            </label>
            <Select
              id="channel"
              name="channel"
              placeholder="Select channel"
              options={[
                { value: 'c1', label: 'Slack #alerts' },
                { value: 'c2', label: 'Webhook' },
              ]}
              value={channel}
              onValueChange={setChannel}
              width="full"
              onSurface="raised"
            />
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="target">
              Target
            </label>
            <Select
              id="target"
              name="target"
              placeholder="Select target"
              options={[
                { value: 'production', label: 'production' },
                { value: 'staging', label: 'staging' },
              ]}
              value={target}
              onValueChange={setTarget}
              width="full"
              onSurface="raised"
            />
          </div>
        </form>
      </Dialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Something to show once, then acknowledge
// ---------------------------------------------------------------------------

export const CreatedToken = createPreview({
  label: 'Created token',
  render: () => <CreatedTokenExample />,
});

function CreatedTokenExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="target/settings/registry-access-token.tsx:148 (stands for the CDN token's created state)"
      origin="base"
      note="A raised InputCopy and a Callout in the body, one acknowledge in the footer. The organization, project and target access tokens use an AlertDialog here instead, since they gate the acknowledge on a checkbox."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open created-token dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        width="lg"
        title="Token successfully created!"
        attrs={{ 'data-cy': 'registry-token-created' }}
        footer={
          <Button data-cy="close" onSurface="raised" onClick={() => setOpen(false)}>
            Ok, got it!
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <InputCopy value="a3f9c2d1e8b74f60a3f9c2d1e8b74f60" onSurface="raised" />
          <Callout type="info">
            This is your unique API key and it is non-recoverable. If you lose this key, you will
            need to create a new one.
          </Callout>
        </div>
      </Dialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// The widest step
// ---------------------------------------------------------------------------

const MEMBERS = [
  { id: 'u1', displayName: 'Ada', fullName: 'Ada Lovelace', email: 'ada@the-guild.dev' },
  { id: 'u2', displayName: 'Grace', fullName: 'Grace Hopper', email: 'grace@the-guild.dev' },
  { id: 'u3', displayName: 'Linus', fullName: 'Linus Torvalds', email: 'linus@the-guild.dev' },
];

export const ExtraLarge = createPreview({
  label: 'Extra large',
  render: () => <TransferOwnershipExample />,
});

function TransferOwnershipExample() {
  const [open, setOpen] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const [confirmation, setConfirmation] = useState('');
  return (
    <CallSite
      source="v2/modals/transfer-organization-ownership.tsx:134 (stands for the proposal submission and issues-found dialogs, and the preflight script editor, which holds two Monaco panes and is not reproduced here)"
      origin="base"
      note="Width xl. The member picker is a searchable Select that also matches the full name and email through keywords, with the email as each option's description."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open transfer-ownership dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        width="xl"
        title="Transfer ownership"
        description="Transferring is completed after the new owner approves the transfer."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onSurface="raised"
              disabled={!newOwner || confirmation !== 'the-guild'}
              onClick={() => setOpen(false)}
            >
              Transfer this organization
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal" htmlFor="newOwner">
              New owner
            </label>
            <Select
              id="newOwner"
              name="newOwner"
              placeholder="Select a member"
              searchable
              searchPlaceholder="Search by name or email..."
              options={MEMBERS.map(member => ({
                value: member.id,
                label: member.displayName,
                description: member.email,
                keywords: `${member.fullName} ${member.email}`,
              }))}
              value={newOwner}
              onValueChange={setNewOwner}
              width="full"
              onSurface="raised"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-normal" htmlFor="confirmation">
              Type <span className="font-bold">the-guild</span> to confirm.
            </label>
            <Input
              id="confirmation"
              name="confirmation"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              onSurface="raised"
            />
          </div>

          <div className="border-neutral-5 h-0 w-full border-t" />

          <div className="font-medium">About the ownership transfer</div>
          <ul className="text-neutral-11 list-inside list-disc px-2 text-sm">
            <li>
              The new owner will receive a confirmation email. If the new owner doesn't accept the
              transfer within 24 hours, the invitation will expire.
            </li>
            <li className="pt-3">
              When you transfer an organization to one of the members, the new owner will get access
              to organization's contents, projects, members, and settings.
            </li>
            <li className="pt-3">
              You will keep your access to the organization's contents, projects, members, and
              settings, except you won't be able to remove the organization.
            </li>
          </ul>
        </div>
      </Dialog>
    </CallSite>
  );
}
