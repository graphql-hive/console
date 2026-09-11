import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from './switch';

export const nav: NavPath = 'Base/FormControls/Switch/Component Examples';

/**
 * Every Switch call site in the app, transcribed with its real copy so a change to the component
 * can be judged against what actually ships.
 *
 * These were migrated from `ui/switch` and `v2/switch` on 2026-09-11. Before that, the same file
 * lived under `Inventory/Switch` and rendered the old components for comparison; both are deleted
 * now, so this is the regression fixture rather than the before picture.
 *
 * The pages themselves cannot be imported: they run GraphQL mutations and several sit behind
 * permission flags. Each preview holds its state locally.
 */

const ENTRIES = [
  {
    source: 'pages/target-checks.tsx:419',
    origin: 'base',
    what: 'Show only changed schemas, label to the left',
    coveredBy: 'Filter toggles',
  },
  {
    source: 'pages/target-checks.tsx:432',
    origin: 'base',
    what: 'Show only failed checks, same row shape',
    coveredBy: 'Filter toggles',
  },
  {
    source: 'pages/target-checks-single.tsx:141',
    origin: 'base',
    what: 'Toggle Diff, text-xs label',
    coveredBy: 'Toggle diff',
  },
  {
    source: 'components/v2/diff-editor.tsx:118',
    origin: 'base',
    what: 'Toggle Diff again, byte-identical to the one above',
    coveredBy: 'Toggle diff',
  },
  {
    source: 'components/project/settings/native-composition.tsx:61',
    origin: 'base',
    what: 'Wrapped in a TooltipTrigger whose copy flips with the state',
    coveredBy: 'Switch as trigger',
  },
  {
    source:
      'components/organization/settings/single-sign-on/oidc-integration-configuration.tsx:607',
    origin: 'base',
    what: 'Wrapped in an AlertDialogTrigger, so toggling opens a confirmation',
    coveredBy: 'Switch as trigger',
  },
  {
    source: 'oidc-integration-configuration.tsx:897, :916, :930',
    origin: 'base',
    what: 'Three OIDC restriction rows: title, description, switch on the right',
    coveredBy: 'Settings rows',
  },
  {
    source: 'components/target/alerts/alert-rule-enabled-toggle.tsx:34',
    origin: 'base',
    what: 'Inside a clickable table row, aria-label only; relies on the built-in stopPropagation',
    coveredBy: 'In a table row',
  },
  {
    source: 'pages/target-settings.tsx:746',
    origin: 'base',
    what: 'Dangerous changes as breaking, sideContent of a settings card',
    coveredBy: 'Settings card switches',
  },
  {
    source: 'pages/target-settings.tsx:799',
    origin: 'base',
    what: 'Conditional breaking changes, same shape',
    coveredBy: 'Settings card switches',
  },
  {
    source: 'pages/target-settings.tsx:1212',
    origin: 'base',
    what: 'App deployment retention, same shape',
    coveredBy: 'Settings card switches',
  },
  {
    source: 'components/base/floating/menu/menu.tsx:239, :318',
    origin: 'base',
    what: 'Decorative, inside a Menu toggle row',
    coveredBy: 'Decorative in a menu',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/switch"
      summary={
        <>
          <strong>13 app call sites plus 2 inside base Menu, all on base/switch.</strong> Two make
          the switch itself a trigger (a tooltip and an alert dialog), which is the shape most
          likely to break on a component change. Two carry <code>data-cy</code> hooks. The three
          former v2 sites lost an orange on-state and a <code>shrink-0</code> className that base
          already carries. Every switch now stops click propagation itself, so the alert-rule toggle
          no longer does it by hand.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// pages/target-checks.tsx:419 and :432 — a filter panel, label left, switch right.
// ---------------------------------------------------------------------------

function FilterToggleRow(props: { id: string; label: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex h-9 flex-row items-center justify-between">
      <Label htmlFor={props.id} className="text-neutral-11 text-sm font-normal">
        {props.label}
      </Label>
      <Switch checked={checked} onCheckedChange={setChecked} id={props.id} />
    </div>
  );
}

export const FilterToggles = createPreview({
  label: 'Filter toggles',
  render: () => (
    <CallSite
      source="pages/target-checks.tsx:419, :432"
      origin="base"
      note="The checks filter panel. Label and switch are pushed apart by justify-between inside a fixed h-9 row. Click the label: id and htmlFor are wired."
    >
      <div className="w-[20rem]">
        <FilterToggleRow id="filter-toggle-has-changes" label="Show only changed schemas" />
        <FilterToggleRow id="filter-toggle-status-failed" label="Show only failed checks" />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// target-checks-single.tsx:141 and v2/diff-editor.tsx:118 — the same row, twice.
// ---------------------------------------------------------------------------

export const ToggleDiff = createPreview({
  label: 'Toggle diff',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:141 and components/v2/diff-editor.tsx:118"
      origin="base"
      note="Byte-identical in both files, down to the shared htmlFor of toggle-diff-mode. If both render at once the label points at two controls."
    >
      <ToggleDiffRow />
    </CallSite>
  ),
});

function ToggleDiffRow() {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="ml-2 flex items-center space-x-2">
      <Label htmlFor="toggle-diff-mode" className="text-xs font-normal">
        Toggle Diff
      </Label>
      <Switch
        id="toggle-diff-mode"
        checked={showDiff}
        onCheckedChange={isChecked => setShowDiff(isChecked)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The two call sites where the switch IS the trigger for something else.
// ---------------------------------------------------------------------------

export const SwitchAsTrigger = createPreview({
  label: 'Switch as trigger',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/settings/native-composition.tsx:61"
        origin="base"
        note="Bare TooltipTrigger around the switch, and the tooltip copy flips between Enable and Disable with the state. Hover it in both positions. Base Switch renders a span, not a button, so this is no longer a button nested in a button."
      >
        <NativeCompositionSwitch />
      </CallSite>
      <CallSite
        source="components/organization/settings/single-sign-on/oidc-integration-configuration.tsx:607"
        origin="base"
        note="Wrapped in an AlertDialogTrigger, so the switch does not toggle directly: clicking opens a confirmation and the mutation runs from the dialog. It has no onCheckedChange at all. Worth checking: base Switch stops click propagation, so confirm the AlertDialogTrigger still opens in the app."
      >
        <div className="flex items-center gap-3">
          <span className="text-sm">Enforce OIDC login for verified domains</span>
          <Switch checked data-cy="oidc-require-verified-domain-login-toggle" />
        </div>
      </CallSite>
    </div>
  ),
});

function NativeCompositionSwitch() {
  const [enabled, setEnabled] = useState(true);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Switch onCheckedChange={setEnabled} checked={enabled} />
        </TooltipTrigger>
        <TooltipContent sideOffset={2}>
          <span className="font-semibold">{enabled ? 'Disable' : 'Enable'}</span> native composition
          for the target
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// oidc-integration-configuration.tsx:897, :916, :930 — the OIDC restriction rows.
// ---------------------------------------------------------------------------

function RestrictionRow(props: { title: string; description: React.ReactNode; dataCy?: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex items-center justify-between space-x-4">
      <div className="flex flex-col space-y-1 text-sm font-medium leading-none">
        <p>{props.title}</p>
        <p className="text-neutral-10 text-xs font-normal leading-snug">{props.description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} data-cy={props.dataCy} />
    </div>
  );
}

export const SettingsRows = createPreview({
  label: 'Settings rows',
  render: () => (
    <CallSite
      source="oidc-integration-configuration.tsx:897, :916, :930"
      origin="base"
      note="Title over a wrapping description, switch pinned right. The descriptions are long and two carry a bold warning clause, so the switch has to stay vertically centred against a variable-height block. shrink-0 is in base's cva, so it does not compress."
    >
      <div className="flex w-[34rem] flex-col gap-4">
        <RestrictionRow
          title="Require OIDC to Join"
          description={
            <>
              Restricts new accounts joining the organization to be authenticated via OIDC.
              <br />
              <span className="font-bold">Existing non-OIDC members will keep their access.</span>
            </>
          }
        />
        <RestrictionRow
          title="Require OIDC to Access"
          description={
            <>
              Prompt users to authenticate with OIDC before accessing the organization.
              <br />
              <span className="font-bold">
                Existing users without OIDC credentials will not be able to access the organization.
              </span>
            </>
          }
        />
        <RestrictionRow
          title="Require Invitation to Join"
          description="Restricts only invited OIDC accounts to join the organization."
          dataCy="oidc-require-invitation-toggle"
        />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// alert-rule-enabled-toggle.tsx:34 — inside a row that is itself clickable.
// ---------------------------------------------------------------------------

export const InATableRow = createPreview({
  label: 'In a table row',
  render: () => (
    <CallSite
      source="components/target/alerts/alert-rule-enabled-toggle.tsx:34"
      origin="base"
      note="The only switch with an aria-label rather than a visible one. The row navigates on click; base Switch stops propagation itself, so clicking the switch here should not trigger the row's onClick. Try both."
    >
      <AlertRuleRow />
    </CallSite>
  ),
});

function AlertRuleRow() {
  const [enabled, setEnabled] = useState(true);
  const [rowClicks, setRowClicks] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="border-neutral-5 hover:bg-neutral-3 flex w-[34rem] cursor-pointer items-center justify-between rounded-md border px-4 py-3"
        onClick={() => setRowClicks(n => n + 1)}
      >
        <div className="flex flex-col">
          <span className="text-sm font-medium">p99 latency over 500ms</span>
          <span className="text-neutral-10 text-xs">Evaluated every 5 minutes</span>
        </div>
        <Switch
          checked={enabled}
          aria-label={enabled ? 'Disable alert rule' : 'Enable alert rule'}
          onCheckedChange={setEnabled}
        />
      </div>
      <span className="text-neutral-10 text-xs">
        Row clicked {rowClicks} {rowClicks === 1 ? 'time' : 'times'}. Toggling the switch should not
        increment this.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// target-settings.tsx:746, :799, :1212 — formerly v2/switch, as the sideContent of a settings card.
// ---------------------------------------------------------------------------

function SettingsCardRow(props: { title: string; description: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="border-neutral-5 flex w-[34rem] items-start justify-between gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <span className="text-neutral-12 text-sm font-medium">{props.title}</span>
        <span className="text-neutral-11 text-sm">{props.description}</span>
        <a href="#" className="text-accent_80 hover:text-accent text-sm">
          Learn more
        </a>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

export const SettingsCardSwitches = createPreview({
  label: 'Settings card switches',
  render: () => (
    <CallSite
      source="pages/target-settings.tsx:746, :799, :1212"
      origin="base"
      note="These were the three v2/switch call sites: larger, and orange when on. They now match every other toggle in the app. The className='shrink-0' each passed is gone; base carries it."
    >
      <div className="flex flex-col gap-4">
        <SettingsCardRow
          title="Consider dangerous changes as breaking"
          description="Marks dangerous changes as breaking, so they fail a schema check."
        />
        <SettingsCardRow
          title="Conditional breaking changes"
          description="Use usage data to decide whether a breaking change actually breaks anyone."
        />
        <SettingsCardRow
          title="App deployment retention"
          description="Retire app deployments that have not received traffic."
        />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// base/floating/menu/menu.tsx:239, :318 — the decorative case.
// ---------------------------------------------------------------------------

export const DecorativeInAMenu = createPreview({
  label: 'Decorative in a menu',
  render: () => <DecorativeRows />,
});

function DecorativeRows() {
  const [flags, setFlags] = useState({ deprecated: true, unused: false });

  return (
    <CallSite
      source="components/base/floating/menu/menu.tsx:239, :318"
      origin="base"
      note="Menu's toggle entries draw a small decorative switch inside a CheckboxItem. The row is the control; the switch just reads out state. Tab through: the switches are skipped. This stands in for the Menu row since it cannot be rendered outside a Menu."
    >
      <div className="flex w-56 flex-col">
        {(['deprecated', 'unused'] as const).map(key => (
          <div
            key={key}
            className="hover:bg-neutral-5 flex h-7 cursor-pointer items-center gap-2 rounded-sm px-2 text-[13px]"
            onClick={() => setFlags(f => ({ ...f, [key]: !f[key] }))}
          >
            <span className="flex-1">Show {key} fields</span>
            <Switch checked={flags[key]} size="small" decorative />
          </div>
        ))}
      </div>
    </CallSite>
  );
}
