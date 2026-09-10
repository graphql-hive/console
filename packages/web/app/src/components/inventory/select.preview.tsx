import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Select';

/**
 * Every `ui/select` and `v2/select` call site in the app, rendered with the **old** component and
 * its real copy, so the base replacement can be judged against what ships today.
 *
 * The pages themselves cannot be imported: they run GraphQL queries, mount react-hook-form, and
 * several sit behind permission flags. Each preview reproduces the call site's options and props
 * and holds the selection in local state.
 *
 * `SelectGroup`, `SelectLabel` and `SelectSeparator` are exported by `ui/select` but have zero
 * call sites, so nothing here exercises them. They should be deleted, not ported.
 */

const ENTRIES = [
  {
    source: 'components/layouts/organization-selectors.tsx:33',
    origin: 'ui',
    what: 'Organization picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'components/layouts/project-selector.tsx:60',
    origin: 'ui',
    what: 'Project picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'components/layouts/target-selector.tsx:105',
    origin: 'ui',
    what: 'Target picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'pages/organization.tsx:224',
    origin: 'ui',
    what: 'Sort projects by requests / versions / name',
    coveredBy: 'Sort selects',
  },
  {
    source: 'pages/project.tsx:237',
    origin: 'ui',
    what: 'Sort targets, same options, different trigger chrome',
    coveredBy: 'Sort selects',
  },
  {
    source: 'components/organization/Permissions.tsx:50',
    origin: 'ui',
    what: 'Legacy access scope picker',
    coveredBy: 'Permission selects',
  },
  {
    source: 'components/organization/members/permission-selector.tsx:226',
    origin: 'ui',
    what: 'Per-permission Not Selected / Allow',
  },
  {
    source: 'components/layouts/target.tsx:375',
    origin: 'ui',
    what: 'CDN artifact modal, graph picker',
    coveredBy: 'CDN artifact modal',
  },
  {
    source: 'components/layouts/target.tsx:403',
    origin: 'ui',
    what: 'CDN artifact modal, artifact picker with disabled options',
    coveredBy: 'CDN artifact modal',
  },
  {
    source:
      'components/organization/settings/access-tokens/create-access-token-sheet-content.tsx:276',
    origin: 'ui',
    what: 'Token expiration, spread from a react-hook-form field',
    coveredBy: 'Access token expiration',
  },
  {
    source:
      'components/organization/settings/personal-access-tokens/create-personal-access-token-sheet-content.tsx:268',
    origin: 'ui',
    what: 'Same expiration select, personal tokens',
    coveredBy: 'Access token expiration',
  },
  {
    source:
      'components/project/settings/access-tokens/create-project-access-token-sheet-content.tsx:288',
    origin: 'ui',
    what: 'Same expiration select, project tokens',
    coveredBy: 'Access token expiration',
  },
  {
    source: 'components/target/insights/save-filter-button.tsx:210',
    origin: 'ui',
    what: 'Save location, the only variant="inset" in the app',
  },
  {
    source: 'components/target/laboratory/create-operation-modal.tsx:226',
    origin: 'ui',
    what: 'Collection picker, popup width matched to trigger',
  },
  {
    source: 'components/target/proposals/editor.tsx:459',
    origin: 'ui',
    what: 'Service picker held permanently at value=""',
  },
  {
    source: 'pages/traces/target-traces-filter.tsx:528',
    origin: 'ui',
    what: 'Time period presets, remounted by key to reset the trigger',
  },
  {
    source: 'components/project/alerts/create-alert.tsx + create-channel.tsx',
    origin: 'v2',
    what: 'A native <select> rather than the Radix one',
    coveredBy: 'v2 native select',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/select and v2/select"
      summary={
        <>
          17 instances. Every one passes a custom trigger child or sets a trigger width, so none is
          covered by today's <code>base/floating/select</code> API as written. Three exports (
          <code>SelectGroup</code>, <code>SelectLabel</code>, <code>SelectSeparator</code>) have
          zero call sites. Four call sites carry <code>data-cy</code> hooks the Playwright suite
          asserts on.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The three top-nav pickers. Identical shape: a bare `variant="default"` trigger whose child is a
// `font-medium` div rather than a `SelectValue`, and `data-cy` on the trigger, the current-value
// div and every option. `e2e/helpers/app.ts` reads all three.
// ---------------------------------------------------------------------------

function NavigationPicker(props: {
  kind: 'organization' | 'project' | 'target';
  options: string[];
}) {
  const [value, setValue] = useState(props.options[0]);

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger variant="default" data-cy={`${props.kind}-picker-trigger`}>
        <div className="font-medium" data-cy={`${props.kind}-picker-current`}>
          {value}
        </div>
      </SelectTrigger>
      <SelectContent>
        {props.options.map(slug => (
          <SelectItem key={slug} value={slug} data-cy={`${props.kind}-picker-option-${slug}`}>
            {slug}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const NavigationPickers = createPreview({
  label: 'Navigation pickers',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/layouts/organization-selectors.tsx:33"
        origin="ui"
        note="Trigger has no width of its own here, so it fills whatever the nav gives it."
      >
        <NavigationPicker kind="organization" options={['the-guild', 'acme-corp', 'personal']} />
      </CallSite>
      <CallSite source="components/layouts/project-selector.tsx:60" origin="ui">
        <NavigationPicker kind="project" options={['graphql-api', 'internal-tools', 'website']} />
      </CallSite>
      <CallSite source="components/layouts/target-selector.tsx:105" origin="ui">
        <NavigationPicker kind="target" options={['production', 'staging', 'development']} />
      </CallSite>
      <CallSite
        source="components/layouts/project-selector.tsx:91"
        origin="ui"
        note="What renders while the query is in flight, in place of the select."
      >
        <div className="bg-neutral-5 h-5 w-48 animate-pulse rounded-full" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization.tsx:224 and pages/project.tsx:237
// Same control, same options, two different triggers: organization renders a bare
// `<SelectTrigger>` (so `variant="default"`), project overrides it to transparent-with-hover.
// Both put a description line under each option label.
// ---------------------------------------------------------------------------

const DAYS = 30;

function SortSelect(props: { scope: 'project' | 'target'; transparentTrigger?: boolean }) {
  const [sortBy, setSortBy] = useState('requests');

  return (
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger
        className={props.transparentTrigger ? 'hover:bg-neutral-2 bg-transparent' : ''}
      >
        {sortBy === 'versions' ? 'Schema Versions' : sortBy === 'name' ? 'Name' : 'Requests'}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="requests">
          <div className="font-medium">Requests</div>
          <div className="text-neutral-10 text-xs">
            GraphQL requests made in the last {DAYS} days.
          </div>
        </SelectItem>
        <SelectItem value="versions">
          <div className="font-medium">Schema Versions</div>
          <div className="text-neutral-10 text-xs">Schemas published in last {DAYS} days.</div>
        </SelectItem>
        <SelectItem value="name">
          <div className="font-medium">Name</div>
          <div className="text-neutral-10 text-xs">Sort by {props.scope} name.</div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export const SortSelects = createPreview({
  label: 'Sort selects',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/organization.tsx:224"
        origin="ui"
        note="Bare trigger, so it takes the default bordered treatment."
      >
        <SortSelect scope="project" />
      </CallSite>
      <CallSite
        source="pages/project.tsx:237"
        origin="ui"
        note="Same control one level down, but the trigger is overridden to transparent with a hover fill. One of the two is drift; worth deciding which."
      >
        <SortSelect scope="target" transparentTrigger />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/Permissions.tsx:50
// Options are computed from the whole list: `noDowngrade` disables anything below the member's
// current scope, and the disabled row grows a second "Can't downgrade" line. Both the trigger and
// the content carry `data-cy`, which `e2e/helpers/usage.ts` reads.
// ---------------------------------------------------------------------------

function LegacyScopePicker(props: { noDowngrade?: boolean; disabled?: boolean }) {
  const [value, setValue] = useState('read-only');
  const options = [
    { value: 'no-access', label: 'No access' },
    { value: 'read-only', label: 'Read-only' },
    { value: 'read-write', label: 'Read & write' },
  ];

  return (
    <Select disabled={props.disabled} value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[150px] shrink-0" data-cy="select-trigger">
        <SelectValue />
      </SelectTrigger>
      <SelectContent data-cy="target-select-content">
        {options.map((item, index) => {
          const isDisabled = props.noDowngrade === true && index < 1;

          return (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={isDisabled}
              data-cy={`select-option-${item.value}`}
            >
              {item.label}
              {isDisabled ? <span className="block text-xs italic">Can't downgrade</span> : null}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export const PermissionSelects = createPreview({
  label: 'Permission selects',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite source="components/organization/Permissions.tsx:50" origin="ui">
        <LegacyScopePicker />
      </CallSite>
      <CallSite
        source="components/organization/Permissions.tsx:50"
        origin="ui"
        note="noDowngrade: options below the member's current scope are disabled and explain themselves on a second line."
      >
        <LegacyScopePicker noDowngrade />
      </CallSite>
      <CallSite
        source="components/organization/Permissions.tsx:51"
        origin="ui"
        note="Disabled outright when the viewer cannot manage the scope. The whole select is then wrapped in a tooltip that says why."
      >
        <LegacyScopePicker disabled />
      </CallSite>
      <CallSite
        source="components/organization/members/permission-selector.tsx:226"
        origin="ui"
        note="Two fixed options, one per permission row, disabled when the permission is read-only or has an unmet dependency."
      >
        <PermissionRowSelect />
      </CallSite>
    </div>
  ),
});

function PermissionRowSelect() {
  const [value, setValue] = useState('not-selected');

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[150px] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="not-selected">Not Selected</SelectItem>
        <SelectItem value="allow">Allow</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// components/layouts/target.tsx:375 and :403
// The CDN artifact modal. Two selects that constrain each other: picking a non-default graph
// disables every artifact except `sdl` and `supergraph`. Both use `SelectValue` with a
// placeholder, and both are the widest triggers in the app.
// ---------------------------------------------------------------------------

function CdnArtifactSelects() {
  const [graph, setGraph] = useState('DEFAULT_GRAPH');
  const [artifact, setArtifact] = useState('sdl');
  const artifacts = [
    { value: 'sdl', label: 'GraphQL SDL' },
    { value: 'supergraph', label: 'Supergraph' },
    { value: 'services', label: 'Services Definition' },
    { value: 'metadata', label: 'Metadata' },
  ];

  return (
    <div className="flex flex-row gap-4">
      <div>
        <Select
          value={graph}
          onValueChange={value => {
            if (value !== 'DEFAULT_GRAPH' && artifact !== 'sdl' && artifact !== 'supergraph') {
              setArtifact('sdl');
            }
            setGraph(value);
          }}
        >
          <SelectTrigger className="w-[250px] max-w-[300px]">
            <SelectValue placeholder="Select Graph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEFAULT_GRAPH">Default Graph</SelectItem>
            <SelectItem value="public-api">public-api</SelectItem>
            <SelectItem value="partner-api">partner-api</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select value={artifact} onValueChange={setArtifact}>
          <SelectTrigger className="w-[250px] max-w-[300px]">
            <SelectValue placeholder="Select Artifact" />
          </SelectTrigger>
          <SelectContent>
            {artifacts.map(t => (
              <SelectItem
                key={t.value}
                value={t.value}
                disabled={
                  t.value !== 'supergraph' && t.value !== 'sdl' && graph !== 'DEFAULT_GRAPH'
                }
              >
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export const CdnArtifactModal = createPreview({
  label: 'CDN artifact modal',
  render: () => (
    <CallSite
      source="components/layouts/target.tsx:375, :403"
      origin="ui"
      note="Pick a non-default graph and the artifact options below collapse to SDL and Supergraph. Nothing explains why the others went grey."
    >
      <CdnArtifactSelects />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// The three create-token sheets, identical in all three files.
// `<Select {...field}>` spreads a react-hook-form field onto a non-DOM component, and
// `FormControl` clones the child to inject `id` / `aria-describedby` / `aria-invalid`. The trigger
// takes `id={field.name}` so the `FormLabel htmlFor` resolves.
// ---------------------------------------------------------------------------

const EXPIRATION_PERIODS = [
  { value: '30', name: '30 days' },
  { value: '90', name: '90 days' },
  { value: '365', name: '1 year' },
  { value: 'no-expiry', name: 'No expiry' },
];

function ExpirationSelect() {
  const [value, setValue] = useState('30');

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <label className="text-neutral-12 text-sm font-medium" htmlFor="expiresAt">
        Expiration
      </label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="expiresAt">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EXPIRATION_PERIODS.map(c => (
            <SelectItem key={c.value} value={c.value}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-neutral-11 text-xs">
        Expire the token automatically after a period of time.
      </p>
    </div>
  );
}

export const AccessTokenExpiration = createPreview({
  label: 'Access token expiration',
  render: () => (
    <CallSite
      source="create-access-token-sheet-content.tsx:276 (and the personal + project sheets)"
      origin="ui"
      note="Three byte-identical copies. The label, description and validation message around it come from base/form, which is what makes this the awkward one to migrate."
    >
      <ExpirationSelect />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// The remaining one-offs, each doing something no other call site does.
// ---------------------------------------------------------------------------

function SaveLocationSelect() {
  const [visibility, setVisibility] = useState('private');

  return (
    <Select value={visibility} onValueChange={setVisibility}>
      <SelectTrigger variant="inset">
        <SelectValue placeholder="Save location" />
      </SelectTrigger>
      <SelectContent variant="inset">
        <SelectItem value="private">My views</SelectItem>
        <SelectItem value="shared">Shared views</SelectItem>
      </SelectContent>
    </Select>
  );
}

function CollectionSelect() {
  const [value, setValue] = useState('');
  const collections = [
    { id: 'c1', name: 'Onboarding', description: 'Queries used in the getting-started guide' },
    { id: 'c2', name: 'Regression', description: 'Operations we replay before every release' },
    { id: 'c3', name: 'Scratch', description: '' },
  ];

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger data-cy="collection-select-trigger">
        {collections.find(c => c.id === value)?.name ?? 'Select a Collection'}
      </SelectTrigger>
      <SelectContent className="w-(--radix-select-trigger-width)">
        {collections.map(c => (
          <SelectItem key={c.id} value={c.id} data-cy="collection-select-item">
            {c.name}
            <div className="mt-1 line-clamp-1 text-xs opacity-50">{c.description}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ServiceSelect(props: { empty?: boolean }) {
  const services = props.empty ? [] : ['products', 'reviews', 'inventory'];

  return (
    <div className="flex grow flex-row">
      <Select onValueChange={() => {}} value="">
        <SelectTrigger
          variant="default"
          data-cy="project-picker-trigger"
          className="min-w-[200px] max-w-[15vw] font-medium"
          disabled={services.length === 0}
        >
          Select a service...
        </SelectTrigger>
        <SelectContent>
          {services.map(name => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TimePeriodSelect() {
  const [value, setValue] = useState('last-7-days');
  const presets = [
    { name: 'last-hour', label: 'Last hour' },
    { name: 'last-24-hours', label: 'Last 24 hours' },
    { name: 'last-7-days', label: 'Last 7 days' },
    { name: 'last-30-days', label: 'Last 30 days' },
  ];

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="bg-neutral-3 w-full">
        <SelectValue placeholder="Select time period" />
      </SelectTrigger>
      <SelectContent>
        {presets.map(preset => (
          <SelectItem value={preset.name} key={preset.name}>
            {preset.label}
          </SelectItem>
        ))}
        <SelectItem value="custom">Custom</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const OneOffs = createPreview({
  label: 'One-offs',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/insights/save-filter-button.tsx:210"
        origin="ui"
        note='The only variant="inset" pair in the app: transparent trigger, and a popup tinted to sit on the popover it lives inside.'
      >
        <SaveLocationSelect />
      </CallSite>
      <CallSite
        source="components/target/laboratory/create-operation-modal.tsx:226"
        origin="ui"
        note="The only popup sized to its trigger rather than its content, and the only one with a description line that can be empty."
      >
        <CollectionSelect />
      </CallSite>
      <CallSite
        source="components/target/proposals/editor.tsx:459"
        origin="ui"
        note='Held at value="" forever, so the trigger always reads "Select a service...". It behaves as an action, not a selection.'
      >
        <ServiceSelect />
      </CallSite>
      <CallSite
        source="components/target/proposals/editor.tsx:464"
        origin="ui"
        note="Disabled when there is nothing left to add. The trigger keeps its prompt text either way."
      >
        <ServiceSelect empty />
      </CallSite>
      <CallSite
        source="pages/traces/target-traces-filter.tsx:528"
        origin="ui"
        note='Choosing "Custom" reveals a date-range popover beside it. The select is remounted by key to reset the trigger when filters are cleared.'
      >
        <div className="w-[280px]">
          <TimePeriodSelect />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/v2/select.tsx, reached through the v2 barrel by the two alert forms.
// A native `<select>` with a hand-drawn chevron, so migrating it is a visual change, not just an
// API change.
// ---------------------------------------------------------------------------

export const V2NativeSelect = createPreview({
  label: 'v2 native select',
  render: () => (
    <CallSite
      source="components/project/alerts/create-alert.tsx:7, create-channel.tsx:7"
      origin="v2"
      note="v2/select is a native element styled to look close to the Radix one. Replacing it changes the open-state appearance on both alert forms."
    >
      <div className="flex flex-col gap-4">
        <select className="border-neutral-5 bg-neutral-2 text-neutral-11 h-10 rounded-md border px-3 py-2 text-sm">
          <option>Slack integration</option>
          <option>Webhook</option>
          <option>MS Teams webhook</option>
        </select>
      </div>
    </CallSite>
  ),
});
