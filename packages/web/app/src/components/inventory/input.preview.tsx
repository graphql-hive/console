import { useState } from 'react';
import { CalendarDays, SearchIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Input as V2Input } from '@/components/v2/input';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Input';

/**
 * `ui/input` and `v2/input` as they ship today. 99 instances, so this transcribes one
 * representative per distinct shape rather than every instance.
 *
 * `ui/input` is a bare styled `<input>` with no wrapper, so every affordance around it - a search
 * icon, a unit suffix, a joined prefix, a clear button - is assembled at the call site with
 * absolute positioning or a sibling div. `v2/input` went the other way and owns a wrapper with
 * `prefix`/`suffix`/`onClear` slots. They look nothing alike.
 *
 * The pages themselves cannot be imported: they mount Formik or react-hook-form and run GraphQL.
 * Each preview holds its value locally.
 */

const ENTRIES = [
  {
    source: 'pages/auth-sign-in.tsx, auth-sign-up.tsx, members/roles.tsx, and ~20 more',
    origin: 'ui',
    what: 'Plain field inside a Form, label above and message below',
    coveredBy: 'Form field',
  },
  {
    source: 'pages/organization.tsx:215, pages/project.tsx:228',
    origin: 'ui',
    what: 'Search with an absolutely positioned icon and responsive width',
    coveredBy: 'Search',
  },
  {
    source: 'pages/target-settings.tsx:1243, :1254 and 2 more',
    origin: 'ui',
    what: 'type=number inline in a sentence, inline-flex! w-20 text-center',
    coveredBy: 'Inline number',
  },
  {
    source: 'pages/project-settings.tsx:282, pages/target-settings.tsx:1479',
    origin: 'ui',
    what: 'Joined to a static prefix block via rounded-l-none',
    coveredBy: 'Joined prefix',
  },
  {
    source: 'pages/traces/target-traces-filter.tsx ×4',
    origin: 'ui',
    what: 'Compact h-8 date and time fields, py-0',
    coveredBy: 'Compact fields',
  },
  {
    source: 'components/ui/date-range-picker.tsx:381, :412',
    origin: 'ui',
    what: 'font-mono with a ghost calendar button overlaid inside the field',
    coveredBy: 'Field with inline button',
  },
  {
    source: 'components/target/insights/list.tsx',
    origin: 'ui',
    what: 'w-16 pagination page number',
    coveredBy: 'Compact fields',
  },
  {
    source: 'components/project/settings/external-composition.tsx',
    origin: 'ui',
    what: 'type=password for a shared secret, max-w-md',
    coveredBy: 'Password',
  },
  {
    source: 'connect-single-sign-on-provider-sheet.tsx ×8',
    origin: 'ui',
    what: 'Password with a masked placeholder showing the stored value ending',
    coveredBy: 'Password',
  },
  {
    source: 'components/ui/input-copy.tsx',
    origin: 'ui',
    what: 'Read-only field wrapped with a copy button',
    coveredBy: 'Field with inline button',
  },
  {
    source: 'components/policy/rules-configuration/string-config.tsx and 9 more',
    origin: 'v2',
    what: 'Wrapper component with prefix, suffix, size and onClear slots',
    coveredBy: 'v2 input',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/input and v2/input"
      summary={
        <>
          <strong>99 instances.</strong> <code>ui/input</code> is a bare styled{' '}
          <code>&lt;input&gt;</code>: no wrapper, so a search icon, a joined prefix or a clear
          button is hand-assembled at each call site with absolute positioning or a sibling div.{' '}
          <code>v2/input</code> is the opposite, owning a bordered wrapper with <code>prefix</code>/
          <code>suffix</code>/<code>onClear</code> slots and three sizes. The two do not resemble
          each other, and both ship. Seven <code>type</code> values are in use and one call site
          reaches for an <code>!important</code> override.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The two implementations. Worth comparing before anything else.
// ---------------------------------------------------------------------------

export const BothImplementations = createPreview({
  label: 'ui vs v2',
  render: () => <BothInputs />,
});

function BothInputs() {
  const [v2Value, setV2Value] = useState('production');

  return (
    <div className="flex flex-col gap-6">
      <CallSite
        source="components/ui/input.tsx"
        origin="ui"
        note="h-10, rounded-md, transparent fill, border-neutral-5. A bare input: no wrapper element at all."
      >
        <div className="flex w-[24rem] flex-col gap-3">
          <Input placeholder="Placeholder" />
          <Input defaultValue="With a value" />
          <Input defaultValue="Disabled" disabled />
        </div>
      </CallSite>
      <CallSite
        source="components/v2/input.tsx"
        origin="v2"
        note="A bordered wrapper at h-[50px] by default, filled bg-neutral-5, rounded-sm. Owns prefix, suffix, three sizes, an isInvalid state and a built-in clear button."
      >
        <div className="flex w-[24rem] flex-col gap-3">
          <V2Input placeholder="Placeholder" />
          <V2Input
            value={v2Value}
            onChange={e => setV2Value(e.target.value)}
            onClear={() => setV2Value('')}
            prefix={<SearchIcon className="size-4" />}
          />
          <V2Input placeholder="Invalid" isInvalid />
          <V2Input placeholder="Small" size="small" />
        </div>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The commonest shape by far: a field inside base/Form.
// ---------------------------------------------------------------------------

export const FormField = createPreview({
  label: 'Form field',
  render: () => (
    <CallSite
      source="pages/auth-sign-in.tsx and ~20 more"
      origin="ui"
      note="Label above, input, description or validation message below. The input itself carries no className; the Form supplies the spacing."
    >
      <div className="flex w-[24rem] flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input id="email" type="email" placeholder="m@example.com" />
        <p className="text-neutral-11 text-xs">We will never share your email.</p>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization.tsx:215 and pages/project.tsx:228 — identical in both files.
// ---------------------------------------------------------------------------

export const Search = createPreview({
  label: 'Search',
  render: () => (
    <CallSite
      source="pages/organization.tsx:215, pages/project.tsx:228"
      origin="ui"
      note="The icon is a sibling positioned at left-2.5 top-2.5 and the input is padded pl-8 to clear it. The fill is overridden per theme, and the width steps at md and lg. Resize the canvas to see it change."
    >
      <div className="relative">
        <SearchIcon className="text-neutral-10 absolute left-2.5 top-2.5 size-4" />
        <Input
          type="search"
          placeholder="Search..."
          className="dark:bg-neutral-3 bg-neutral-2 w-full rounded-lg pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-settings.tsx:1243 onwards — number fields set inside a running sentence.
// ---------------------------------------------------------------------------

export const InlineNumber = createPreview({
  label: 'Inline number',
  render: () => (
    <CallSite
      source="pages/target-settings.tsx:1243, :1254"
      origin="ui"
      note="Fields sit inside a wrapping sentence, so they need inline-flex rather than the component's flex. The `!` is an important override fighting the base class, which is the clearest signal in the app that Input's default display is wrong for this."
    >
      <div className="flex w-[34rem] flex-wrap items-center gap-2 text-sm">
        <span>Retire an app deployment when it</span>
        <span>was created at least</span>
        <Input type="number" min="0" defaultValue="30" className="inline-flex! w-20 text-center" />
        <span>days ago and has not been used for at least</span>
        <Input type="number" min="0" defaultValue="14" className="inline-flex! w-20 text-center" />
        <span>days.</span>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// project-settings.tsx:282 and target-settings.tsx:1479 — a slug field joined to a URL prefix.
// ---------------------------------------------------------------------------

export const JoinedPrefix = createPreview({
  label: 'Joined prefix',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/project-settings.tsx:282"
        origin="ui"
        note="A static div carrying the base URL, then the input with rounded-l-none so the two read as one control. On a two-column grid, so below md the prefix sits above the field with full corners."
      >
        <div className="grid max-w-xl grid-cols-1 md:grid-cols-2">
          <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 overflow-hidden text-nowrap rounded-md border px-3 py-2 text-sm md:rounded-r-none md:border-r-0">
            app.graphql-hive.com/the-guild/
          </div>
          <Input placeholder="slug" className="rounded-l-none" defaultValue="graphql-api" />
        </div>
      </CallSite>
      <CallSite
        source="pages/target-settings.tsx:1479"
        origin="ui"
        note="Same idea one level deeper, but a flex row with a fixed w-48 field rather than a responsive grid. Two solutions to one problem."
      >
        <div className="flex items-center">
          <div className="border-neutral-5 text-neutral-10 bg-neutral-2 h-10 rounded-md rounded-r-none border-y border-l px-3 py-2 text-sm">
            app.graphql-hive.com/the-guild/graphql-api/
          </div>
          <Input placeholder="slug" className="w-48 rounded-l-none" defaultValue="production" />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Compact fields: the traces filter and the insights pager.
// ---------------------------------------------------------------------------

export const CompactFields = createPreview({
  label: 'Compact fields',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/traces/target-traces-filter.tsx ×4"
        origin="ui"
        note="h-8 with py-0, shorter than the component's h-10 default. Date and time pairs for the custom range."
      >
        <div className="flex flex-col gap-2">
          <Label className="text-neutral-10 text-sm font-normal">Start</Label>
          <div className="flex items-center gap-2">
            <Input type="date" defaultValue="2026-09-01" className="h-8 w-[152px] py-0" />
            <Input type="time" defaultValue="00:00" className="h-8 w-16 py-0" />
          </div>
        </div>
      </CallSite>
      <CallSite
        source="components/target/insights/list.tsx"
        origin="ui"
        note="w-16 page number in a pager. Keeps the h-10 default, so it is taller than the traces fields above."
      >
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="page">Page</Label>
          <Input id="page" type="number" defaultValue="3" className="w-16" />
          <span className="text-neutral-11">of 12</span>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// A button living inside the field, which ui/input cannot express without absolute positioning.
// ---------------------------------------------------------------------------

export const FieldWithInlineButton = createPreview({
  label: 'Field with inline button',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/date-range-picker.tsx:381"
        origin="ui"
        note="The button is absolutely positioned at right-2 top-1/2 -translate-y-1/2 over a font-mono field. Exactly the case v2/input's `suffix` slot exists for."
      >
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="from" className="text-neutral-10 text-xs">
            From
          </Label>
          <div className="relative flex w-full">
            <Input type="text" id="from" defaultValue="now-30d" className="font-mono text-xs" />
            <Button
              variant="ghost"
              className="absolute right-2 top-1/2 size-6 -translate-y-1/2 px-0"
            >
              <CalendarDays className="size-3.5" />
            </Button>
          </div>
        </div>
      </CallSite>
      <CallSite
        source="components/ui/input-copy.tsx"
        origin="ui"
        note="A read-only field with a copy button beside rather than inside it, so the two do not read as one control the way the joined-prefix ones do."
      >
        <div className="flex w-[24rem] items-center gap-2">
          <Input readOnly defaultValue="hv1/8f3a11c2e4d6..." className="font-mono text-xs" />
          <Button variant="outline">Copy</Button>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Passwords and secrets.
// ---------------------------------------------------------------------------

export const Password = createPreview({
  label: 'Password',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/settings/external-composition.tsx"
        origin="ui"
        note="Endpoint and secret pair. The two fields set different width caps, max-w-md shrink-0 and w-full max-w-md."
      >
        <div className="flex flex-col gap-3">
          <Input placeholder="Endpoint" className="max-w-md shrink-0" />
          <Input type="password" placeholder="Secret" className="w-full max-w-md" />
        </div>
      </CallSite>
      <CallSite
        source="components/organization/settings/single-sign-on/connect-single-sign-on-provider-sheet.tsx"
        origin="ui"
        note="When a secret is already stored, the placeholder previews its last characters rather than showing a value. autoComplete is off."
      >
        <div className="flex w-[24rem] flex-col gap-1.5">
          <Label className="text-sm font-medium">Client Secret</Label>
          <Input type="password" autoComplete="off" placeholder="Value ending with a91f" />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/v2/input.tsx, reached through the v2 barrel by 10 files.
// ---------------------------------------------------------------------------

export const V2Inputs = createPreview({
  label: 'v2 input',
  render: () => <V2InputShapes />,
});

function V2InputShapes() {
  const [value, setValue] = useState('require-description');

  return (
    <CallSite
      source="components/policy/rules-configuration/string-config.tsx and 9 more"
      origin="v2"
      note="The clear button only appears once there is a value, and it is drawn as an inline SVG rather than an icon component. `size` here means the wrapper's height, which is a different axis from anything ui/input offers."
    >
      <div className="flex w-[24rem] flex-col gap-3">
        <V2Input
          value={value}
          onChange={e => setValue(e.target.value)}
          onClear={() => setValue('')}
          placeholder="Rule name"
        />
        <V2Input size="medium" placeholder="Medium" />
        <V2Input size="small" placeholder="Small" />
        <V2Input placeholder="Invalid" isInvalid />
      </div>
    </CallSite>
  );
}
