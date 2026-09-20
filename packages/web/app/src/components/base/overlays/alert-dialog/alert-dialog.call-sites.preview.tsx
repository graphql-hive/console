import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { DiscardAccessTokenDraft } from '@/components/common/discard-access-token-draft';
import { CallSite } from '@/components/inventory/shared';
import { AccessTokenCreatedDialog } from '@/components/organization/settings/access-tokens/access-token-created-dialog';
import { Button } from '@/components/base/button/button';
import { Callout } from '@/components/ui/callout';
import { Switch } from '../../switch/switch';
import { AlertDialog } from './alert-dialog';

export const nav: NavPath = 'Base/Overlays/AlertDialog/Component Examples';

/**
 * Every alert dialog shape in the app on base AlertDialog, one preview per shape with the call
 * sites it stands for. Confirms run mutations in the app; here they only close, after a short
 * pending state where the real one waits on the network.
 */

// ---------------------------------------------------------------------------
// Destructive confirmation with a pending state
// ---------------------------------------------------------------------------

export const Destructive = createPreview({
  label: 'Destructive',
  render: () => <DeleteMemberExample />,
});

function DeleteMemberExample() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <CallSite
      source="organization/members/list.tsx:442 (stands for the delete organization, project, target, role, group, invitation, collection, operation, access token, CDN token, alert rule, OIDC provider and registered domain confirmations)"
      origin="base"
      note="The confirm holds and relabels while the mutation runs, and cancel and Escape are held with it. The dialog closes from the caller once the mutation settles; outcomes go to toasts."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Delete member
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={next => {
          if (!pending) setOpen(next);
        }}
        title="Are you absolutely sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>user@the-guild.dev</strong> from the organization.
          </>
        }
        confirm={{
          label: pending ? 'Deleting...' : 'Continue',
          variant: 'destructive',
          disabled: pending,
          onClick: () => {
            setPending(true);
            setTimeout(() => {
              setPending(false);
              setOpen(false);
            }, 1200);
          },
        }}
        cancel={{ disabled: pending }}
      />
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Opened by an inline trigger
// ---------------------------------------------------------------------------

export const InlineTrigger = createPreview({
  label: 'Inline trigger',
  render: () => <ScimMatchedExample />,
});

function ScimMatchedExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="organization/members/list.tsx:286"
      origin="base"
      note="One of the few call sites with a JSX trigger: a link-styled button in the member row. The trigger renders in place and gets focus back on close."
    >
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button type="button" variant="link">
            <TriangleAlert className="mr-1 size-3" />
            SCIM matched this existing account
          </Button>
        }
        title="Allow SCIM to manage Ada?"
        description={
          <>
            SCIM matched <strong>ada@the-guild.dev</strong> to an existing organization member.
          </>
        }
        confirm={{
          label: 'Allow SCIM management',
          variant: 'destructive',
          onClick: () => setOpen(false),
        }}
      />
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Driven by a switch
// ---------------------------------------------------------------------------

export const SwitchDriven = createPreview({
  label: 'Switch driven',
  render: () => <EnforceOidcExample />,
});

function EnforceOidcExample() {
  const [enforced, setEnforced] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="organization/settings/single-sign-on/oidc-integration-configuration.tsx:558 (stands for the SCIM provisioning confirmation beside it)"
      origin="base"
      note="The Switch does not flip on its own: its change opens the question, and the confirm applies the change. The Callout only shows when turning the restriction on."
    >
      <div className="flex items-center gap-3">
        <Switch checked={enforced} onCheckedChange={() => setOpen(true)} />
        <span className="text-neutral-12 text-sm">Enforce OIDC login for verified domains</span>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title={enforced ? 'Disable enforced OIDC login' : 'Enforce OIDC login'}
        description={
          enforced
            ? 'Users will be able to login with any method, such as email + password or social logins.'
            : 'Users will no longer be able to login with email+password or social logins.'
        }
        confirm={{
          label: enforced ? 'Disable enforced ODIC login' : 'Enforce OIDC login',
          variant: 'destructive',
          onClick: () => {
            setEnforced(value => !value);
            setOpen(false);
          },
        }}
      >
        {enforced ? null : (
          <Callout type="warning">
            This action can potentially lock you out of the organization. Make sure your OIDC
            provider is configured properly and you can log in using it.
          </Callout>
        )}
      </AlertDialog>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Two ways forward
// ---------------------------------------------------------------------------

export const TwoActions = createPreview({
  label: 'Two actions',
  render: () => <DiscardDraftExample />,
});

function DiscardDraftExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="common/discard-access-token-draft.tsx:14, the real component"
      origin="base"
      note="Closing a token sheet mid-draft asks this. Neither answer is a plain cancel, so the cancel takes a label."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Close token sheet
      </Button>
      <DiscardAccessTokenDraft
        open={open}
        onContinue={() => setOpen(false)}
        onDiscard={() => setOpen(false)}
      />
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Gated acknowledgement
// ---------------------------------------------------------------------------

export const Gated = createPreview({
  label: 'Gated',
  render: () => <AccessTokenCreatedExample />,
});

function AccessTokenCreatedExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="organization/settings/access-tokens/access-token-created-dialog.tsx:8, the real component (stands for the project and target token sub-pages)"
      origin="base"
      note="No cancel: the only way out is the confirm, and it stays disabled until the checkbox says the token is stored. It opens once the create sheet has finished closing."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Show created token
      </Button>
      <AccessTokenCreatedDialog
        open={open}
        privateAccessKey="hvo1/a3f9c2d1e8b74f60a3f9c2d1e8b74f60"
        onClose={() => setOpen(false)}
      />
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Leaving
// ---------------------------------------------------------------------------

export const Leave = createPreview({
  label: 'Leave',
  render: () => <LeaveOrganizationExample />,
});

function LeaveOrganizationExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="ui/user-menu.tsx:301 (stands for the disable contract confirmation)"
      origin="base"
      note="Two sentences and a bold warning in one description passage."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Leave organization
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Leave the-guild?"
        description={
          <>
            Are you sure you want to leave this organization? You will lose access to{' '}
            <span className="text-neutral-12 font-semibold">the-guild</span>.{' '}
            <span className="text-neutral-12 font-semibold">This action is irreversible!</span>
          </>
        }
        confirm={{
          label: 'Leave organization',
          variant: 'destructive',
          onClick: () => setOpen(false),
        }}
      />
    </CallSite>
  );
}
