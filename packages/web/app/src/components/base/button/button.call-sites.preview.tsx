import { useState } from 'react';
import {
  ArrowUp,
  CalendarDays,
  Copy,
  Info,
  MoveDownIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Input } from '../input/input';
import { Button } from './button';

export const nav: NavPath = 'Base/Primitives/Button/Component Examples';

/**
 * Every button shape in the app on base Button, one preview per shape with the call sites it
 * stands for. The pages run queries and mutations, so state is local and a click only toggles.
 *
 * History: `ui/button` (shadcn's cva over a Radix Slot) on 120 files and 263 tags until round 8,
 * with eight variants, seven sizes, and a className on three tags in four. What the sites needed
 * became the mapping below; what they did not need is gone. The old grey default is base
 * default, the accent primary is the neutral-12 primary, secondary is outline, link and
 * orangeLink are one link with no box, lg and sm land on the 36px rung and xs on compact, the
 * icon squares are `iconOnly` and `icon-sm`, and `asChild` is `render`. Nav items, the stepper's
 * step circles, the calendar's cells and the explorer letter strips were never buttons in the
 * design sense and carry their own classes now.
 */

const ENTRIES = [
  {
    source: 'auth pages, organization-new.tsx, organization-join.tsx, dialog and sheet footers',
    what: 'The default fill on a raised surface, onSurface=raised, often width=full',
    coveredBy: 'On a raised surface',
  },
  {
    source:
      'organization-settings.tsx, target-settings.tsx, project-settings.tsx, subscription pages',
    what: 'Default, outline and destructive on the page surface',
    coveredBy: 'On the page',
  },
  {
    source:
      'date-range-picker.tsx, target-alerts-create.tsx, insights filter dialogs, preflight editor',
    what: 'primary: the one loud action in a form',
    coveredBy: 'On the page',
  },
  {
    source: 'query-error.tsx, error.tsx, checks and history Load more, "N more" popover triggers',
    what: 'link: text that acts, inline with the copy around it',
    coveredBy: 'Links',
  },
  {
    source: 'layouts/organization.tsx, layouts/project.tsx, layouts/target.tsx, preflight panel',
    what: 'link with a leading icon, in a flex span',
    coveredBy: 'Links',
  },
  {
    source:
      'auth-verify-email.tsx, organization-settings.tsx integrations, subscription pages, target.tsx',
    what: 'A router Link or an anchor through render',
    coveredBy: 'Buttons that navigate',
  },
  {
    source: 'traces filter, list sort toggles, input-copy.tsx',
    what: 'layout=iconOnly with a lucide icon and an aria-label',
    coveredBy: 'Icon squares',
  },
  {
    source: 'copy-icon-button.tsx, OIDC section headers, diff editor arrows, group mapping rows',
    what: 'size=icon-sm: the 28px square for a small icon inside something else',
    coveredBy: 'Icon squares',
  },
  {
    source: 'target-laboratory.tsx header, trace sheet footer, proposal editor, preflight toggle',
    what: 'size=compact for a control in a toolbar or a small panel',
    coveredBy: 'Compact',
  },
  {
    source: 'target-alerts.tsx, sub-page-navigation-link.tsx',
    what: 'Nav items: their own classes, not Button',
    coveredBy: 'Not buttons',
  },
  {
    source: 'ui/stepper.tsx, ui/calendar.tsx, explorer letter strips',
    what: 'Step circles, calendar cells and letter tabs: their own classes, not Button',
    coveredBy: 'Not buttons',
  },
].map(entry => ({ origin: 'base' as const, ...entry }));

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/button"
      summary={
        <>
          One button over every shape. The surface is a prop: on the page it is <code>base</code>,
          in a dialog, sheet or raised card it is <code>raised</code>. Width is a prop with two
          values. A button that navigates takes its Link through <code>render</code>. Everything a
          call site used to override with a class is either a prop now or was never the button's
          job.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The default fill, on the two surfaces.
// ---------------------------------------------------------------------------

export const OnRaisedSurface = createPreview({
  label: 'On a raised surface',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/auth-sign-in.tsx and the other auth cards"
        origin="base"
        note="A submit at full width under the fields, then the provider buttons as outline. All raised, since the card is."
      >
        <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 flex w-[24rem] flex-col gap-3 rounded-md border p-6">
          <Button type="submit" width="full" onSurface="raised">
            Sign in
          </Button>
          <Button variant="outline" width="full">
            Login with GitHub
          </Button>
        </div>
      </CallSite>
      <CallSite
        source="every Dialog and Sheet footer"
        origin="base"
        note="The footer pair: outline Cancel, raised default action. The laboratory dialogs stretch both to full width."
      >
        <div className="bg-neutral-3 border-neutral-5 flex w-[28rem] flex-col gap-6 rounded-md border p-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button onSurface="raised">Transfer this organization</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" width="full">
              Cancel
            </Button>
            <Button width="full" onSurface="raised">
              Add Operation
            </Button>
          </div>
        </div>
      </CallSite>
    </div>
  ),
});

export const OnThePage = createPreview({
  label: 'On the page',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization-settings.tsx, target-settings.tsx"
        origin="base"
        note="The page surface: default, outline and destructive beside each other, as on a settings tab."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Save</Button>
          <Button variant="outline">Reset</Button>
          <Button variant="destructive">Delete Organization</Button>
        </div>
      </CallSite>
      <CallSite
        source="ui/date-range-picker.tsx, target-alerts-create.tsx, insights save filter"
        origin="base"
        note="primary is the one loud action in a form, the neutral-12 fill. The accent fill the old primary had is gone."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Apply date range</Button>
          <Button variant="primary" disabled>
            Saving...
          </Button>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export const Links = createPreview({
  label: 'Links',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="ui/query-error.tsx, pages/target-checks.tsx, errors-and-changes.tsx"
        origin="base"
        note="Inline with the copy: no box, so it sits on the text's own line."
      >
        <p className="text-neutral-11 max-w-md text-sm">
          The check failed on a breaking change that affects{' '}
          <Button variant="link">12 operations</Button>. If this was expected, contact{' '}
          <Button variant="link" render={<a href="#" />}>
            support
          </Button>
          .
        </p>
      </CallSite>
      <CallSite
        source="components/layouts/organization.tsx, project.tsx, target.tsx"
        origin="base"
        note="A leading icon in a flex span, the header action beside the secondary navigation."
      >
        <Button variant="link">
          <span className="flex items-center">
            <PlusIcon size={16} className="mr-2" />
            New project
          </span>
        </Button>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Buttons that navigate
// ---------------------------------------------------------------------------

export const ButtonsThatNavigate = createPreview({
  label: 'Buttons that navigate',
  render: () => (
    <CallSite
      source="pages/auth-verify-email.tsx, organization-settings.tsx integrations, pages/target.tsx"
      origin="base"
      note="render takes the router Link or an anchor and the button's classes, ref and handlers merge onto it. An anchor stands in for the TanStack Link here."
    >
      <div className="flex w-[24rem] flex-col gap-2">
        <Button width="full" onSurface="raised" render={<a href="#" />}>
          Continue
        </Button>
        <Button variant="outline" width="full" render={<a href="#" />}>
          Logout
        </Button>
        <div>
          <Button variant="outline" render={<a href="#" />}>
            Unused schema
          </Button>
        </div>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Icon squares
// ---------------------------------------------------------------------------

export const IconSquares = createPreview({
  label: 'Icon squares',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization.tsx sort toggle, traces filter, ui/input-copy.tsx"
        origin="base"
        note="iconOnly is a square at the rung's height with a lucide icon and an aria-label. The copy square flips its icon while copied."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" layout="iconOnly" icon={MoveDownIcon} aria-label="Sort" />
          <Button variant="outline" layout="iconOnly" icon={PlusIcon} aria-label="Add trace ID" />
          <Button variant="outline" layout="iconOnly" icon={Copy} aria-label="Copy" />
        </div>
      </CallSite>
      <CallSite
        source="ui/copy-icon-button.tsx, members/groups.tsx rows, v2/diff-editor.tsx, OIDC headers"
        origin="base"
        note="icon-sm is the 28px square for a small icon that sits inside something else: a row, a header, a toolbar."
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Copy">
            <Copy className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2Icon className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="About breaking changes">
            <Info className="size-3" />
          </Button>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Compact
// ---------------------------------------------------------------------------

export const Compact = createPreview({
  label: 'Compact',
  render: () => (
    <CallSite
      source="pages/target-laboratory.tsx header, pages/target-trace.tsx sheet footer, preflight panel"
      origin="base"
      note="The 30px rung for a control in a toolbar or a small panel: what sm and xs were."
    >
      <div className="flex items-center gap-3">
        <Button variant="outline" size="compact">
          Connect GraphQL API Endpoint
        </Button>
        <Button variant="ghost" size="compact">
          <ArrowUp className="mr-2 size-4" /> Show Parent Span
        </Button>
        <Button variant="destructive" size="compact">
          Remove from proposal
        </Button>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// Beside a field
// ---------------------------------------------------------------------------

export const BesideAField = createPreview({
  label: 'Beside a field',
  render: () => <FieldWithButton />,
});

function FieldWithButton() {
  const [value, setValue] = useState('');
  return (
    <CallSite
      source="target/settings/contract-form.tsx tag fields, ui/date-range-picker.tsx"
      origin="base"
      note="Add beside a field in a dialog, and the calendar button in the trailing slot of a text field: a compact ghost iconOnly."
    >
      <div className="flex w-[28rem] flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add included tag"
            value={value}
            onChange={event => setValue(event.target.value)}
            onSurface="raised"
          />
          <Button type="button" onSurface="raised" disabled={value === ''}>
            Add
          </Button>
        </div>
        <Input
          defaultValue="now-30d"
          mono
          trailing={
            <Button
              layout="iconOnly"
              icon={CalendarDays}
              aria-label="Pick a date"
              variant="ghost"
              size="compact"
            />
          }
        />
      </div>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Not buttons
// ---------------------------------------------------------------------------

export const NotButtons = createPreview({
  label: 'Not buttons',
  render: () => (
    <CallSite
      source="components/navigation/sub-page-navigation-link.tsx, pages/target-alerts.tsx, ui/stepper.tsx, ui/calendar.tsx, the explorer letter strips"
      origin="base"
      note="These rendered the old Button with most of its defaults undone. They are plain elements with their own classes now: a vertical nav item, a step circle, a calendar cell, a letter tab. Their previews live with their components."
    >
      <p className="text-neutral-10 max-w-prose text-xs">
        See Base/FormControls/Switch/Component Examples for the settings nav, the access token
        sheets under Base/Overlays/Sheet for the stepper, and Base/Floating/Tooltip/Component
        Examples for the letter strip.
      </p>
    </CallSite>
  ),
});
