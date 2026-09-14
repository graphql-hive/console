import { useState } from 'react';
import { CalendarDays, SearchIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Button } from '@/components/ui/button';
import { InputCopy } from '@/components/ui/input-copy';
import { Label } from '@/components/ui/label';
import { ResourceDetails } from '@/components/ui/resource-details';
import { Button as BaseButton } from '../button/button';
import { Input } from './input';

export const nav: NavPath = 'Base/Primitives/Input/Component Examples';

/**
 * Every field in the app, by shape, transcribed from one of its sites with the others listed
 * under it. The pages themselves cannot be imported: they mount react-hook-form or Formik and run
 * GraphQL, so each preview holds its value locally.
 *
 * History: `ui/input` (a bare styled input, so a search icon, a joined prefix or a unit suffix
 * was hand-assembled around it with absolute positioning or a sibling div) and `v2/input` (a
 * 50px wrapper with prefix, suffix and clear slots that no call site ever passed) until round 5.
 * The traces filter carried its own copy of `ui/input` as well. What the sites needed became
 * props: `leadingIcon`, `prefixText`, `trailing`, `width`, `size`, `mono`, `invalid`, `onSurface`.
 */

const ENTRIES = [
  {
    source:
      'pages/auth-sign-in.tsx, auth-sign-up.tsx, auth-reset-password.tsx, auth-sso.tsx, organization-new.tsx',
    origin: 'base',
    what: 'Form fields on a raised card, onSurface=raised',
    coveredBy: 'Form field',
  },
  {
    source:
      'members/invitations.tsx, members/roles.tsx ×2, layouts/organization.tsx, layouts/project.tsx, organization-settings.tsx ×2 (audit logs), registry-access-token.tsx, the three laboratory modals, ui/prompt.tsx',
    origin: 'base',
    what: 'Form fields in a Dialog, onSurface=raised',
    coveredBy: 'Form field',
  },
  {
    source:
      'connect-single-sign-on-provider-sheet.tsx ×8, oidc-registered-domain-sheet.tsx, the three create-*-access-token sheets, organization-support.tsx',
    origin: 'base',
    what: 'Form fields in a Sheet, onSurface=raised',
    coveredBy: 'Form field',
  },
  {
    source:
      'traces/target-traces-filter.tsx (Trace ID, Search values), insights/save-filter-button.tsx, proposals/editor.tsx (Service URL), target-proposals-new.tsx (title)',
    origin: 'base',
    what: 'Controlled by hand on the page, the base surface',
    coveredBy: 'Form field',
  },
  {
    source:
      'pages/organization.tsx, pages/project.tsx, apps/AppFilter.tsx, members/list.tsx, members/groups.tsx, ui/date-range-picker.tsx (quick ranges)',
    origin: 'base',
    what: 'Search fields, leadingIcon; the width lives on a wrapper',
    coveredBy: 'Search',
  },
  {
    source:
      'pages/target-settings.tsx ×7 (conditional breaking changes, app deployment retirement)',
    origin: 'base',
    what: 'type=number inside a sentence, width=xs in a flex-wrap row',
    coveredBy: 'Inline number',
  },
  {
    source:
      'organization-settings.tsx, project-settings.tsx, target-settings.tsx (slug); ui/resource-details.tsx through InputCopy',
    origin: 'base',
    what: 'Joined to a prefix block, prefixText',
    coveredBy: 'Joined prefix',
  },
  {
    source:
      'traces/target-traces-filter.tsx (Duration MIN / MAX), target-insights-manage-filters.tsx (rename), policy/rules-configuration/string-config.tsx',
    origin: 'base',
    what: 'size=compact',
    coveredBy: 'Compact fields',
  },
  {
    source: 'target/insights/list.tsx',
    origin: 'base',
    what: 'Pager page number, width=xs at the default height',
    coveredBy: 'Compact fields',
  },
  {
    source: 'ui/date-range-picker.tsx (From, To)',
    origin: 'base',
    what: 'mono with a calendar Button in the trailing slot',
    coveredBy: 'Field with inline button',
  },
  {
    source: 'ui/input-copy.tsx',
    origin: 'base',
    what: 'Read-only mono with a copy button beside it',
    coveredBy: 'Field with inline button',
  },
  {
    source: 'project/settings/external-composition.tsx, target-settings.tsx (GraphQL endpoint URL)',
    origin: 'base',
    what: 'width=md for an endpoint or a secret',
    coveredBy: 'Password',
  },
  {
    source:
      'user/settings.tsx ×2, transfer-organization-ownership.tsx, organization-subscription-manage.tsx ×2, cdn-access-tokens.tsx, alerts/create-channel.tsx ×3, schema-contracts.tsx ×3, target-settings.tsx ×8',
    origin: 'base',
    what: 'Formik fields, invalid wired by hand from touched and errors',
    coveredBy: 'Formik fields',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/input"
      summary={
        <>
          One field over every shape. Surface is a prop: a field on the page is <code>base</code>, a
          field in a sheet, dialog or raised card is <code>raised</code>. Everything that used to be
          assembled around the old input is a slot or a variant now.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The commonest shape: a form field, on whichever surface its form sits.
// ---------------------------------------------------------------------------

export const FormField = createPreview({
  label: 'Form field',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/auth-sign-in.tsx:209 and the other auth pages"
        origin="base"
        note="Inside a raised AuthCard, so onSurface=raised. The error state is what react-hook-form's FormControl produces through aria-invalid."
      >
        <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 flex w-[24rem] flex-col gap-4 rounded-md border p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input id="email" type="email" placeholder="m@example.com" onSurface="raised" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-invalid" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email-invalid"
              type="email"
              defaultValue="not an email"
              invalid
              onSurface="raised"
            />
            <p className="text-xs font-medium text-red-500">Enter a valid email address.</p>
          </div>
        </div>
      </CallSite>
      <CallSite
        source="members/roles.tsx:213 and the other Dialog and Sheet fields"
        origin="base"
        note="Dialogs and sheets sit at neutral-3 as well, so their fields are raised. The create-role dialog's name field."
      >
        <div className="bg-neutral-3 border-neutral-5 flex w-[24rem] flex-col gap-1.5 rounded-md border p-6">
          <Label htmlFor="role-name" className="text-sm font-medium">
            Name
          </Label>
          <Input
            id="role-name"
            placeholder="Enter a name"
            type="text"
            autoComplete="off"
            onSurface="raised"
          />
        </div>
      </CallSite>
      <CallSite
        source="traces/target-traces-filter.tsx:109, insights/save-filter-button.tsx:192"
        origin="base"
        note="Controlled by hand on the page: the base surface."
      >
        <div className="flex w-[24rem] flex-col gap-3">
          <Input type="text" placeholder="Trace ID..." />
          <Input placeholder="Name this filter collection" />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Search fields. The icon is the component's; the width lives on a wrapper.
// ---------------------------------------------------------------------------

export const Search = createPreview({
  label: 'Search',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization.tsx:215, pages/project.tsx:228"
        origin="base"
        note="The width steps at md and lg on the wrapper. Resize the canvas to see it change. type=search keeps the browser's own clear control; appearance-none keeps the component's corners."
      >
        <div className="w-full md:w-[200px] lg:w-[336px]">
          <Input type="search" placeholder="Search..." leadingIcon={SearchIcon} />
        </div>
      </CallSite>
      <CallSite
        source="members/list.tsx:657, members/groups.tsx:96"
        origin="base"
        note="A fixed 224px wrapper in the sub-page header."
      >
        <div className="w-56">
          <Input placeholder="Search by username or email" leadingIcon={SearchIcon} />
        </div>
      </CallSite>
      <CallSite
        source="apps/AppFilter.tsx:23"
        origin="base"
        note="Grows to fill the toolbar row it sits in, from a 200px minimum."
      >
        <div className="flex w-[30rem]">
          <div className="min-w-[200px] grow">
            <Input placeholder="Search by operation name..." leadingIcon={SearchIcon} />
          </div>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Number fields set inside a running sentence.
// ---------------------------------------------------------------------------

export const InlineNumber = createPreview({
  label: 'Inline number',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-settings.tsx:1241, :1252, :1277, :1290"
        origin="base"
        note="The input is inline by default, so the sentence is a flex-wrap row with a gap. xs is 4rem; the text is left-aligned."
      >
        <div className="text-neutral-10 w-[34rem] space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span>was created at least</span>
            <Input type="number" min="0" defaultValue={30} width="xs" />
            <span>days ago and has not been used for at least</span>
            <Input type="number" min="0" defaultValue={14} width="xs" />
            <span>days</span>
          </div>
        </div>
      </CallSite>
      <CallSite
        source="pages/target-settings.tsx:842, :870, :894"
        origin="base"
        note="The conditional breaking changes formula: a number inside each radio item's label, and the period row under them."
      >
        <div className="flex w-[34rem] flex-col gap-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <Input type="number" step="0.01" defaultValue={5} width="xs" />
            Percent of Traffic
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span>in the past</span>
            <Input type="number" min="1" max={30} defaultValue={7} width="xs" />
            <span>days.</span>
          </div>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// A slug field joined to a URL prefix, and the resource id row built the same way.
// ---------------------------------------------------------------------------

export const JoinedPrefix = createPreview({
  label: 'Joined prefix',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="organization-settings.tsx:295, project-settings.tsx:278, target-settings.tsx:1466"
        origin="base"
        note="One control: the prefix is the component's, and the width is the field's own, so a long path never squeezes it. FormControl wraps the input itself, so the label and error state reach the field."
      >
        <div className="flex flex-col gap-3">
          <Input
            placeholder="slug"
            prefixText="app.graphql-hive.com/"
            defaultValue="the-guild"
            width="sm"
          />
          <Input
            placeholder="slug"
            prefixText="app.graphql-hive.com/the-guild/"
            defaultValue="graphql-api"
            width="sm"
          />
          <Input
            placeholder="slug"
            prefixText="app.graphql-hive.com/the-guild/graphql-api/"
            defaultValue="production"
            width="sm"
          />
        </div>
      </CallSite>
      <CallSite
        source="ui/resource-details.tsx:9"
        origin="base"
        note="The id row on the settings pages: InputCopy's prefixText, read-only mono, the copy button beside it."
      >
        <ResourceDetails id="3af771c7-2750-4e75-89ce-d606adfa2a9e" label="Target ID" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Compact fields, and the pager that keeps the default height.
// ---------------------------------------------------------------------------

export const CompactFields = createPreview({
  label: 'Compact fields',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/traces/target-traces-filter.tsx (Duration MIN / MAX)"
        origin="base"
        note="compact mono, with the unit in the trailing slot. Before round 5 this was a hand-rolled input with a zinc border on MIN and neutral-5 on MAX."
      >
        <div className="w-56 space-y-2">
          <div className="space-y-1">
            <label className="font-mono text-xs text-zinc-400">MIN</label>
            <Input
              type="number"
              defaultValue={0}
              size="compact"
              mono
              trailing={<span className="text-neutral-10 font-mono text-xs">ms</span>}
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-xs text-zinc-400">MAX</label>
            <Input
              type="number"
              defaultValue={100_000}
              size="compact"
              mono
              trailing={<span className="text-neutral-10 font-mono text-xs">ms</span>}
            />
          </div>
        </div>
      </CallSite>
      <CallSite
        source="pages/target-insights-manage-filters.tsx:229, policy/rules-configuration/string-config.tsx:43"
        origin="base"
        note="A rename field inline in a list row, and a policy rule option. Both compact; the buttons and the option box are omitted."
      >
        <div className="flex w-72 flex-col gap-3">
          <Input defaultValue="Checkout errors" size="compact" />
          <Input defaultValue="get" size="compact" />
        </div>
      </CallSite>
      <CallSite
        source="components/target/insights/list.tsx:338"
        origin="base"
        note="The pager keeps the default height; only the width is xs."
      >
        <div className="flex items-center gap-2 text-sm">
          <div>Go to:</div>
          <Input id="page" width="xs" type="number" defaultValue={1} />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// A button living inside the field, and a button beside it.
// ---------------------------------------------------------------------------

export const FieldWithInlineButton = createPreview({
  label: 'Field with inline button',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/date-range-picker.tsx (From, To)"
        origin="base"
        note="The calendar button is the trailing slot: a compact ghost icon-only base Button. The field is mono."
      >
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="from" className="text-neutral-10 text-xs">
            From
          </Label>
          <Input
            type="text"
            id="from"
            defaultValue="now-30d"
            mono
            trailing={
              <BaseButton
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
      <CallSite
        source="components/ui/input-copy.tsx"
        origin="base"
        note="Read-only mono, selects all on focus, with the copy button beside it so the two do not read as one control. Click the field to see the select-on-focus."
      >
        <InputCopy value="hv1/8f3a11c2e4d6b9f0a7c3e1d5b2a8f4c6" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Endpoints and secrets.
// ---------------------------------------------------------------------------

export const Password = createPreview({
  label: 'Password',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/settings/external-composition.tsx:341, :370"
        origin="base"
        note="Endpoint and secret pair, both width=md."
      >
        <div className="flex flex-col gap-3">
          <Input width="md" placeholder="Endpoint" type="text" autoComplete="off" />
          <Input width="md" placeholder="Secret" type="password" autoComplete="off" />
        </div>
      </CallSite>
      <CallSite
        source="connect-single-sign-on-provider-sheet.tsx:215"
        origin="base"
        note="When a secret is already stored, the placeholder previews its last characters rather than showing a value. In a sheet, so raised."
      >
        <div className="bg-neutral-3 border-neutral-5 flex w-[24rem] flex-col gap-1.5 rounded-md border p-6">
          <Label className="text-sm font-medium">Client Secret</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder="Value ending with a91f"
            onSurface="raised"
          />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Formik fields: invalid is wired by hand from touched and errors.
// ---------------------------------------------------------------------------

export const FormikFields = createPreview({
  label: 'Formik fields',
  render: () => <FormikShapes />,
});

function FormikShapes() {
  const [fullName, setFullName] = useState('');
  const invalid = fullName.trim() === '';

  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/user/settings.tsx:95"
        origin="base"
        note="The profile modal. invalid follows touched and errors; the message is a plain span under the field. Clear the field to see both."
      >
        <div className="flex w-[24rem] flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="fullName">
            Full name
          </label>
          <Input
            id="fullName"
            placeholder="Full name"
            name="fullName"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            invalid={invalid}
          />
          {invalid ? <span className="text-red-500">Full name is required</span> : null}
        </div>
      </CallSite>
      <CallSite
        source="pages/target-settings.tsx:1585"
        origin="base"
        note="The GraphQL endpoint URL form: width=md beside its Save button, the error text under the row."
      >
        <div>
          <div className="flex flex-row items-center gap-x-2">
            <Input
              placeholder="Endpoint Url"
              name="graphqlEndpointUrl"
              defaultValue="sss"
              invalid
              width="md"
            />
            <Button type="submit">Save</Button>
          </div>
          <div className="mt-2 text-red-500">Please enter a valid url.</div>
        </div>
      </CallSite>
      <CallSite
        source="components/project/alerts/create-channel.tsx:130, organization-subscription-manage.tsx:488"
        origin="base"
        note="A channel name in the create-channel modal, and the operations limit beside the subscription slider."
      >
        <div className="flex w-[24rem] flex-col gap-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" htmlFor="channel-name">
              Name
            </label>
            <Input id="channel-name" name="name" placeholder="Example: Slack #hives" />
            <p className="text-neutral-10 text-sm">
              This will be displayed on channels list, we recommend to make it self-explanatory.
            </p>
          </div>
          <div className="ml-auto w-48">
            <Input defaultValue="500M" />
          </div>
        </div>
      </CallSite>
    </div>
  );
}
