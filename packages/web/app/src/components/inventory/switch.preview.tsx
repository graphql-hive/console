import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch as V2Switch } from '@/components/v2/switch';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Switch';

/**
 * Every `ui/switch` and `v2/switch` call site in the app, rendered with the **old** components.
 *
 * The two implementations look different, which is the first thing to check here: `ui/switch` is
 * a neutral track that fills `neutral-12` when on; `v2/switch` is larger and turns orange. Three
 * target-settings rows use the v2 one, so those rows do not match the rest of the app today.
 *
 * The pages themselves cannot be imported: they run GraphQL mutations and several sit behind
 * permission flags. Each preview holds its state locally.
 */

const ENTRIES = [
  {
    source: 'pages/target-checks.tsx:419',
    origin: 'ui',
    what: 'Show only changed schemas, label to the left',
    coveredBy: 'Filter toggles',
  },
  {
    source: 'pages/target-checks.tsx:432',
    origin: 'ui',
    what: 'Show only failed checks, same row shape',
    coveredBy: 'Filter toggles',
  },
  {
    source: 'pages/target-checks-single.tsx:141',
    origin: 'ui',
    what: 'Toggle Diff, text-xs label',
    coveredBy: 'Toggle diff',
  },
  {
    source: 'components/v2/diff-editor.tsx:118',
    origin: 'ui',
    what: 'Toggle Diff again, byte-identical to the one above',
    coveredBy: 'Toggle diff',
  },
  {
    source: 'components/project/settings/native-composition.tsx:61',
    origin: 'ui',
    what: 'Wrapped in a TooltipTrigger whose copy flips with the state',
    coveredBy: 'Switch as trigger',
  },
  {
    source:
      'components/organization/settings/single-sign-on/oidc-integration-configuration.tsx:607',
    origin: 'ui',
    what: 'Wrapped in an AlertDialogTrigger, so toggling opens a confirmation',
    coveredBy: 'Switch as trigger',
  },
  {
    source: 'oidc-integration-configuration.tsx:897, :916, :930',
    origin: 'ui',
    what: 'Three OIDC restriction rows: title, description, switch on the right',
    coveredBy: 'Settings rows',
  },
  {
    source: 'components/target/alerts/alert-rule-enabled-toggle.tsx:34',
    origin: 'ui',
    what: 'Inside a clickable table row, so it stops propagation and carries an aria-label',
    coveredBy: 'In a table row',
  },
  {
    source: 'pages/target-settings.tsx:746',
    origin: 'v2',
    what: 'Dangerous changes as breaking, sideContent of a settings card',
    coveredBy: 'v2 settings switches',
  },
  {
    source: 'pages/target-settings.tsx:799',
    origin: 'v2',
    what: 'Conditional breaking changes, same shape',
    coveredBy: 'v2 settings switches',
  },
  {
    source: 'pages/target-settings.tsx:1212',
    origin: 'v2',
    what: 'App deployment retention, same shape',
    coveredBy: 'v2 settings switches',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/switch and v2/switch"
      summary={
        <>
          <strong>13 instances across 7 files.</strong> Ten use <code>ui/switch</code> and three use{' '}
          <code>v2/switch</code>, which is visibly larger and turns orange rather than neutral — so
          three target-settings rows already look unlike every other toggle in the app. Two call
          sites make the switch itself a trigger (a tooltip and an alert dialog), which is the shape
          most likely to break on a component swap. Two carry <code>data-cy</code> hooks.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The two implementations, side by side. This is the comparison worth making first.
// ---------------------------------------------------------------------------

export const BothImplementations = createPreview({
  label: 'ui vs v2',
  render: () => {
    return (
      <div className="flex flex-col gap-6">
        <CallSite
          source="components/ui/switch.tsx"
          origin="ui"
          note="h-[24px] w-[44px], neutral track, fills neutral-12 when on. Ten call sites."
        >
          <UiSwitchPair />
        </CallSite>
        <CallSite
          source="components/v2/switch.tsx"
          origin="v2"
          note="h-[25px] w-[45px], and the thumb turns orange-500 when on with an orange-800 hover border. Three call sites, all on target settings."
        >
          <V2SwitchPair />
        </CallSite>
      </div>
    );
  },
});

function UiSwitchPair() {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-6">
      <Switch checked={on} onCheckedChange={setOn} />
      <Switch checked={false} onCheckedChange={() => {}} />
      <Switch checked disabled />
    </div>
  );
}

function V2SwitchPair() {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-6">
      <V2Switch checked={on} onCheckedChange={setOn} />
      <V2Switch checked={false} onCheckedChange={() => {}} />
      <V2Switch checked disabled />
    </div>
  );
}

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
      origin="ui"
      note="The checks filter panel. Label and switch are pushed apart by justify-between inside a fixed h-9 row."
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
      origin="ui"
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
// The two call sites where the switch IS the trigger for something else. These are the ones to
// watch on a component swap: both rely on the switch forwarding a ref and firing hover or click
// through to the wrapper.
// ---------------------------------------------------------------------------

export const SwitchAsTrigger = createPreview({
  label: 'Switch as trigger',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/settings/native-composition.tsx:61"
        origin="ui"
        note="Bare TooltipTrigger around the switch, and the tooltip copy flips between Enable and Disable with the state. Hover it in both positions."
      >
        <NativeCompositionSwitch />
      </CallSite>
      <CallSite
        source="components/organization/settings/single-sign-on/oidc-integration-configuration.tsx:607"
        origin="ui"
        note="Wrapped in an AlertDialogTrigger, so the switch does not toggle directly: clicking opens a confirmation and the mutation runs from the dialog. It has no onCheckedChange at all."
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
      origin="ui"
      note="Title over a wrapping description, switch pinned right. The descriptions are long and two of them carry a bold warning clause, so the switch has to stay vertically centred against a variable-height block."
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
      origin="ui"
      note="The only switch with an aria-label rather than a visible one, and the only one calling stopPropagation, because the alert-rules row navigates on click. Toggling must not open the rule."
    >
      <AlertRuleRow />
    </CallSite>
  ),
});

function AlertRuleRow() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div
      className="border-neutral-5 hover:bg-neutral-3 flex w-[34rem] cursor-pointer items-center justify-between rounded-md border px-4 py-3"
      onClick={() => {}}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">p99 latency over 500ms</span>
        <span className="text-neutral-10 text-xs">Evaluated every 5 minutes</span>
      </div>
      <Switch
        checked={enabled}
        aria-label={enabled ? 'Disable alert rule' : 'Enable alert rule'}
        onClick={e => e.stopPropagation()}
        onCheckedChange={setEnabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// target-settings.tsx:746, :799, :1212 — the v2 switch, as the sideContent of a settings card.
// ---------------------------------------------------------------------------

function V2SettingsRow(props: { title: string; description: string }) {
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
      <V2Switch className="shrink-0" checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

export const V2SettingsSwitches = createPreview({
  label: 'v2 settings switches',
  render: () => (
    <CallSite
      source="pages/target-settings.tsx:746, :799, :1212"
      origin="v2"
      note="All three pass className='shrink-0' and sit in a card's sideContent. Compare the orange against the ui switches above: these three rows are the only place in the app that colour appears on a toggle."
    >
      <div className="flex flex-col gap-4">
        <V2SettingsRow
          title="Consider dangerous changes as breaking"
          description="Marks dangerous changes as breaking, so they fail a schema check."
        />
        <V2SettingsRow
          title="Conditional breaking changes"
          description="Use usage data to decide whether a breaking change actually breaks anyone."
        />
        <V2SettingsRow
          title="App deployment retention"
          description="Retire app deployments that have not received traffic."
        />
      </div>
    </CallSite>
  ),
});
