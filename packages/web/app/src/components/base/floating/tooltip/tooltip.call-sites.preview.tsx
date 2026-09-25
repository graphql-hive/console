import { useState } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  Copy,
  GitCompareIcon,
  Info,
  XIcon,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/base/button/button';
import { SecondaryNavigation } from '@/components/base/navigation/secondary-navigation/secondary-navigation';
import { focusRingQuiet } from '@/components/base/shared-styles';
import { Switch } from '@/components/base/switch/switch';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { cn } from '@/lib/utils';
import { Popover } from '../popover/popover';
import { Select } from '../select/select';
import { Tooltip } from './tooltip';

export const nav: NavPath = 'Base/Floating/Tooltip/Component Examples';

/**
 * The shapes tooltips take across the app, transcribed with their real copy so a change to the
 * component can be judged against what actually ships. There were 103 roots across 55 files at
 * migration time, so this holds one representative per shape rather than every instance; each
 * preview lists the call sites it stands for.
 *
 * History: `ui/tooltip` (Radix) and `v2/tooltip` until round 3, with a provider per instance and
 * four different delays. Now one `TooltipProvider` at the root, one 300ms delay, 12px text. About
 * thirty of the old tooltips were info icons whose only job was to open the explanation; per Base
 * UI's guidance those are `Popover` with `openOnHover` and a real button, so they also open on
 * click, keyboard and touch. A few of those appear here for contrast.
 */

const ENTRIES = [
  {
    source: 'components/ui/copy-icon-button.tsx:14',
    origin: 'base',
    what: 'Icon button hint, the most common shape (~30 sites)',
    coveredBy: 'On buttons',
  },
  {
    source: 'components/v2/diff-editor.tsx:85',
    origin: 'base',
    what: 'Previous / next change, a row of icon buttons',
    coveredBy: 'On buttons',
  },
  {
    source: 'pages/target-explorer-unused.tsx:197',
    origin: 'base',
    what: 'The A-Z letter strip, where grouping matters',
    coveredBy: 'On buttons',
  },
  {
    source: 'components/organization/members/list.tsx:345',
    origin: 'base',
    what: 'A status label ("Owner") explained on hover',
    coveredBy: 'On status',
  },
  {
    source: 'components/target/explorer/common.tsx:275',
    origin: 'base',
    what: 'Deprecation reason on a struck-through field name, maxWidth screen',
    coveredBy: 'On status',
  },
  {
    source: 'pages/target-history-schema-version.tsx:59',
    origin: 'base',
    what: 'StatusTooltip: a composition icon inside a tab (two pages)',
    coveredBy: 'On status',
  },
  {
    source: 'pages/target-traces.tsx:380',
    origin: 'base',
    what: 'A timestamp cell with a key/value table behind it, hoverable popup',
    coveredBy: 'Rich content',
  },
  {
    source: 'components/target/explorer/filter.tsx:85',
    origin: 'base',
    what: 'Hints on tabs',
    coveredBy: 'Rich content',
  },
  {
    source: 'components/project/settings/native-composition.tsx:58',
    origin: 'base',
    what: 'A hint on a Switch whose copy flips with the state',
    coveredBy: 'Rich content',
  },
  {
    source: 'components/organization/Permissions.tsx:92',
    origin: 'base',
    what: 'A whole disabled row as the trigger',
    coveredBy: 'Disabled controls',
  },
  {
    source: 'pages/native-composition-diff.tsx:209',
    origin: 'base',
    what: 'Controlled: forced open on a disabled button',
    coveredBy: 'Disabled controls',
  },
  {
    source: 'components/organization/members/permission-selector.tsx:147',
    origin: 'base',
    what: 'Info icon → Popover (one of ~30)',
    coveredBy: 'Infotips, for contrast',
  },
  {
    source: 'components/target/settings/schema-contracts.tsx:205',
    origin: 'base',
    what: 'Info button with a paragraph → Popover, width lg',
    coveredBy: 'Infotips, for contrast',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/floating/tooltip"
      summary={
        <>
          One provider at the root, one delay, one text size. <code>ui/tooltip</code>,{' '}
          <code>v2/tooltip</code> and <code>@radix-ui/react-tooltip</code> are gone. Tooltips stay
          on things that already do something; info icons became <code>Popover</code> with{' '}
          <code>openOnHover</code>.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Hints on buttons: the element does something, the tooltip names it.
// ---------------------------------------------------------------------------

export const OnButtons = createPreview({
  label: 'On buttons',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/copy-icon-button.tsx:14"
        origin="base"
        note="The most common shape. disableHoverablePopup, so it closes as you leave the button."
      >
        <Tooltip
          trigger={<Button layout="iconOnly" icon={Copy} aria-label="Copy access token" />}
          content="Copy access token"
          disableHoverablePopup
        />
      </CallSite>
      <CallSite
        source="components/v2/diff-editor.tsx:85"
        origin="base"
        note="Two hints in a row. Hover one, then slide to the other: the second opens instantly."
      >
        <div className="flex items-center">
          <div className="mr-2 text-xs font-normal">Navigate changes </div>
          <Tooltip
            trigger={
              <Button variant="ghost" size="icon-sm">
                <ArrowUpIcon />
              </Button>
            }
            content="Previous change"
          />
          <Tooltip
            trigger={
              <Button variant="ghost" size="icon-sm">
                <ArrowDownIcon />
              </Button>
            }
            content="Next change"
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/target-explorer-unused.tsx:197"
        origin="base"
        note="The A-Z strip. Sweep the pointer across it; only the first waits the delay."
      >
        <LetterStrip />
      </CallSite>
    </div>
  ),
});

function LetterStrip() {
  const [activeLetter, setActiveLetter] = useState('A');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const counts: Record<string, number> = { A: 12, B: 3, C: 8, D: 1, E: 5, F: 2 };
  return (
    <div>
      {letters.map(letter => (
        <Tooltip
          key={letter}
          trigger={
            <button
              type="button"
              onClick={() => setActiveLetter(letter)}
              className={cn(
                'inline-flex h-9 items-center px-2 py-1 text-sm font-medium transition-colors',
                focusRingQuiet,
                letter === activeLetter
                  ? 'bg-neutral-2 text-accent'
                  : 'text-neutral-10 hover:bg-neutral-2 hover:text-accent',
              )}
            >
              {letter}
            </button>
          }
          content={`${counts[letter]} types`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hints on status: a label or icon that shows state, explained on hover. Non-interactive, so the
// trigger is the element itself (or a span around an icon) and the hint is hover-only.
// ---------------------------------------------------------------------------

/** The helper both the history and checks pages define for the icons inside their tabs. */
function StatusTooltip(props: { icon: React.ReactNode; label: string }) {
  return (
    <Tooltip trigger={<span className="inline-flex">{props.icon}</span>} content={props.label} />
  );
}

export const OnStatus = createPreview({
  label: 'On status',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite source="components/organization/members/list.tsx:345" origin="base">
        <Tooltip
          trigger={<span className="font-bold">Owner</span>}
          content="The organization owner has full access to everything within the organization. The role of the owner can not be changed."
        />
      </CallSite>
      <CallSite
        source="components/target/explorer/common.tsx:275"
        origin="base"
        note="maxWidth='screen' so a long reason does not wrap early; side right."
      >
        <Tooltip
          trigger={<span className="line-through">legacyField</span>}
          side="right"
          sideOffset={5}
          maxWidth="screen"
          content={
            <>
              <div className="mb-2">Deprecation reason</div>
              <div className="text-neutral-10">
                Use `products` instead; removed in the next major.
              </div>
            </>
          }
        />
      </CallSite>
      <CallSite
        source="pages/target-history-schema-version.tsx:59"
        origin="base"
        note="The contract picker's options carry a composition-status icon; the same StatusTooltip helper lives in both the history and checks pages. Open the select and hover an icon."
      >
        <ContractPicker />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Rich content and other triggers.
// ---------------------------------------------------------------------------

function ContractPicker() {
  const [contract, setContract] = useState('default');
  return (
    <Select
      aria-label="Contract"
      value={contract}
      onValueChange={setContract}
      options={[
        {
          value: 'default',
          label: 'Default Graph',
          trailing: (
            <StatusTooltip
              icon={<GitCompareIcon className="size-3.5" />}
              label="Main graph schema changed"
            />
          ),
        },
        {
          value: 'contract',
          label: 'public@1a2b3c4d',
          trailing: (
            <StatusTooltip
              icon={<CheckIcon className="text-success size-3.5" />}
              label="Contract composition succeeded."
            />
          ),
        },
      ]}
      size="compact"
      onSurface="raised"
      width="md"
    />
  );
}

function TimestampCell() {
  const rows = [
    ['Local', 'Sep 10 14:22:07'],
    ['UTC', 'Sep 10 12:22:07'],
    ['Unix', '1789042927481'],
    ['ISO', '2026-09-10T12:22:07Z'],
  ];
  return (
    <Tooltip
      side="bottom"
      trigger={<div className="px-4 font-mono text-xs uppercase">Sep 10 14:22:07</div>}
      content={
        <div className="min-w-[150px] cursor-auto" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <div className="text-neutral-10">{k}</div>
                <div className="font-mono">{v}</div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function SwitchHint() {
  const [enabled, setEnabled] = useState(true);
  return (
    <Tooltip
      trigger={
        <span className="inline-flex">
          <Switch onCheckedChange={setEnabled} checked={enabled} />
        </span>
      }
      sideOffset={2}
      content={
        <>
          <span className="font-semibold">{enabled ? 'Disable' : 'Enable'}</span> native composition
          for the target
        </>
      }
    />
  );
}

export const RichContent = createPreview({
  label: 'Rich content',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-traces.tsx:380"
        origin="base"
        note="A table behind a cell. Hoverable, so the pointer can move into it; clicks inside stop before the row (which would open the trace sheet)."
      >
        <TimestampCell />
      </CallSite>
      <CallSite
        source="components/target/explorer/filter.tsx:64"
        origin="base"
        note="Hints on the explorer's type filter: a pill SecondaryNavigation whose items each carry a tooltip."
      >
        <SecondaryNavigation
          aria-label="Type filter"
          variant="pill"
          size="sm"
          value="all"
          items={[
            ['all', 'All', 'Shows all types, including unused and deprecated ones'],
            ['unused', 'Unused', 'Shows only types that are not used in any operation'],
            ['deprecated', 'Deprecated', 'Shows only types that are marked as deprecated'],
          ].map(([value, label, tooltip]) => ({
            value,
            label,
            tooltip,
            to: '/$organizationSlug/$projectSlug/$targetSlug',
            params: { organizationSlug: 'the-guild', projectSlug: 'gateway', targetSlug: value },
          }))}
        />
      </CallSite>
      <CallSite
        source="components/project/settings/native-composition.tsx:58"
        origin="base"
        note="A Switch wrapped in a span. The copy flips with the state; hover it in both positions."
      >
        <SwitchHint />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Disabled controls. A disabled button has pointer-events-none, so the hint goes on a wrapper.
// ---------------------------------------------------------------------------

function ForcedOpen() {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const hasServices = false;
  return (
    <Tooltip
      open={!hasServices && isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
      maxWidth="screen"
      trigger={
        <span className="inline-flex max-w-64 text-right">
          <Button width="full" variant="outline" disabled={!hasServices}>
            <Copy className="text-neutral-8 mr-2 size-4" /> Copy services JSON
          </Button>
        </span>
      }
      content={
        <span className="flex items-center text-pretty">
          <XIcon className="mr-1 size-4 text-red-500" />{' '}
          <span>
            Cannot copy services JSON because there are no services published for this target.
          </span>
        </span>
      }
    />
  );
}

export const DisabledControls = createPreview({
  label: 'Disabled controls',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/Permissions.tsx:92"
        origin="base"
        note="The whole row is the trigger, wrapped only when the viewer lacks permission. The Select inside is disabled; the row still takes the hover."
      >
        <Tooltip
          trigger={
            <div className="flex flex-row items-center justify-between space-x-4 py-2 opacity-50">
              <div>
                <div className="text-neutral-12 font-semibold">Registry</div>
                <div className="text-neutral-10 text-xs">Publish and check schemas.</div>
              </div>
              <Button variant="outline" disabled>
                Read-only
              </Button>
            </div>
          }
          content="Your user account does not have these permissions."
        />
      </CallSite>
      <CallSite
        source="pages/native-composition-diff.tsx:209"
        origin="base"
        note="Controlled: the call site holds it open only while the button is disabled. Hover the button."
      >
        <ForcedOpen />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Infotips, for contrast. These are Popovers now: the icon exists to open the explanation, so it
// is a button, opens on hover and on click, and is reachable by keyboard and touch.
// ---------------------------------------------------------------------------

export const Infotips = createPreview({
  label: 'Infotips, for contrast',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/members/permission-selector.tsx:147"
        origin="base"
        note="One of about thirty. Hover opens it after the tooltip delay; click toggles it."
      >
        <Popover
          trigger={
            <button type="button" aria-label="Why this cannot be assigned">
              <Info className="size-4" />
            </button>
          }
          openOnHover
          content={
            <p className="text-neutral-11 text-sm">
              Your membership has insufficient authority for assigning this permission.
            </p>
          }
        />
      </CallSite>
      <CallSite
        source="components/target/settings/schema-contracts.tsx:205"
        origin="base"
        note="A paragraph behind an info button, width lg."
      >
        <div className="flex items-center">
          <span className="text-yellow-500">Inactive</span>
          <Popover
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Why inactive">
                <Info className="size-4" />
              </Button>
            }
            openOnHover
            width="lg"
            content={
              <div className="text-neutral-11 text-sm font-normal">
                <p>
                  This Contract is no longer active and no more contract versions or contract checks
                  will be published for it.
                </p>
                <p className="mt-1">
                  It is not possible to enable a contract again. Please create a new contract
                  instead.
                </p>
              </div>
            }
          />
        </div>
      </CallSite>
      <CallSite
        source="components/organization/members/list.tsx:88"
        origin="base"
        note="A list behind a badge: the groups that did not fit inline."
      >
        <Popover
          trigger={
            <button type="button" aria-label="All groups">
              <Badge variants={{ variant: 'outline' }} content="+3 more" />
            </button>
          }
          openOnHover
          side="top"
          width="auto"
          content={
            <ul className="space-y-1 text-left">
              {['platform', 'billing', 'support'].map(g => (
                <li key={g}>
                  <Badge content={g} />
                </li>
              ))}
            </ul>
          }
        />
      </CallSite>
    </div>
  ),
});
