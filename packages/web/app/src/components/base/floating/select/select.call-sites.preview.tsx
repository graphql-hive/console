import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Select } from './select';

export const nav: NavPath = 'Base/Floating/Select/Component Examples';

/**
 * Every Select call site in the app, transcribed with its real copy so a change to the component
 * can be judged against what actually ships.
 *
 * The pages themselves cannot be imported: they run GraphQL queries, mount react-hook-form or
 * Formik, and several sit behind permission flags. Each preview reproduces the call site's
 * options and props and holds the selection in local state.
 *
 * History: these were `ui/select` (Radix) and `v2/select` (a native element) until round 3. Three
 * `ui/select` exports (`SelectGroup`, `SelectLabel`, `SelectSeparator`) had no call sites and
 * went with it, as did `TimelineFilter` in `pages/traces/target-traces-filter.tsx`, a component
 * holding a select that nothing mounted.
 */

const ENTRIES = [
  {
    source: 'components/layouts/organization-selectors.tsx:29',
    origin: 'base',
    what: 'Organization picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'components/layouts/project-selector.tsx:60',
    origin: 'base',
    what: 'Project picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'components/layouts/target-selector.tsx:104',
    origin: 'base',
    what: 'Target picker in the top nav',
    coveredBy: 'Navigation pickers',
  },
  {
    source: 'pages/organization.tsx:224',
    origin: 'base',
    what: 'Sort projects by requests / versions / name',
    coveredBy: 'Sort selects',
  },
  {
    source: 'pages/project.tsx:237',
    origin: 'base',
    what: 'Sort targets, same options',
    coveredBy: 'Sort selects',
  },
  {
    source: 'components/organization/Permissions.tsx:44',
    origin: 'base',
    what: 'Legacy access scope picker',
    coveredBy: 'Permission selects',
  },
  {
    source: 'components/organization/members/permission-selector.tsx:220',
    origin: 'base',
    what: 'Per-permission Not Selected / Allow',
    coveredBy: 'Permission selects',
  },
  {
    source: 'components/layouts/target.tsx:369',
    origin: 'base',
    what: 'CDN artifact modal, graph picker',
    coveredBy: 'CDN artifact modal',
  },
  {
    source: 'components/layouts/target.tsx:394',
    origin: 'base',
    what: 'CDN artifact modal, artifact picker with disabled options',
    coveredBy: 'CDN artifact modal',
  },
  {
    source:
      'components/organization/settings/access-tokens/create-access-token-sheet-content.tsx:270',
    origin: 'base',
    what: 'Token expiration, mapped from a react-hook-form field',
    coveredBy: 'Access token expiration',
  },
  {
    source:
      'components/organization/settings/personal-access-tokens/create-personal-access-token-sheet-content.tsx:262',
    origin: 'base',
    what: 'Same expiration select, personal tokens',
    coveredBy: 'Access token expiration',
  },
  {
    source:
      'components/project/settings/access-tokens/create-project-access-token-sheet-content.tsx:282',
    origin: 'base',
    what: 'Same expiration select, project tokens',
    coveredBy: 'Access token expiration',
  },
  {
    source: 'components/target/insights/save-filter-button.tsx:204',
    origin: 'base',
    what: 'Save location, the one onSurface="raised"',
    coveredBy: 'One-offs',
  },
  {
    source: 'components/target/laboratory/create-operation-modal.tsx:226',
    origin: 'base',
    what: 'Collection picker, popup width matched to trigger',
    coveredBy: 'One-offs',
  },
  {
    source: 'components/target/proposals/editor.tsx:451',
    origin: 'base',
    what: 'Service picker held permanently at value=""',
    coveredBy: 'One-offs',
  },
  {
    source: 'components/project/alerts/create-alert.tsx:106, :128, :150',
    origin: 'base',
    what: 'Alert type / channel / target, Formik',
    coveredBy: 'Alert forms',
  },
  {
    source: 'components/project/alerts/create-channel.tsx:154',
    origin: 'base',
    what: 'Channel type, Formik',
    coveredBy: 'Alert forms',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/floating/select"
      summary={
        <>
          16 instances across 17 files, all on base since round 3. Four carry <code>data-cy</code>{' '}
          hooks the Playwright suite asserts on: the three nav pickers (
          <code>*-picker-trigger</code>
          ), the Permissions scope picker (trigger, popup and option) and the collection picker in
          the laboratory.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// The three top-nav pickers. Same shape in every file: options are the slugs, the trigger echoes
// the current one, and `e2e/helpers/app.ts` waits on `[data-cy="*-picker-trigger"]` containing
// the slug after every navigation.
// ---------------------------------------------------------------------------

function NavigationPicker(props: {
  kind: 'organization' | 'project' | 'target';
  options: string[];
}) {
  const [value, setValue] = useState(props.options[0]);

  return (
    <Select
      options={props.options.map(slug => ({ value: slug, label: slug }))}
      value={value}
      onValueChange={setValue}
      data-cy={`${props.kind}-picker-trigger`}
    />
  );
}

export const NavigationPickers = createPreview({
  label: 'Navigation pickers',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/layouts/organization-selectors.tsx:29"
        origin="base"
        note="No width of its own; sizes to the slug."
      >
        <NavigationPicker kind="organization" options={['the-guild', 'acme-corp', 'personal']} />
      </CallSite>
      <CallSite source="components/layouts/project-selector.tsx:60" origin="base">
        <NavigationPicker kind="project" options={['graphql-api', 'internal-tools', 'website']} />
      </CallSite>
      <CallSite source="components/layouts/target-selector.tsx:104" origin="base">
        <NavigationPicker kind="target" options={['production', 'staging', 'development']} />
      </CallSite>
      <CallSite
        source="components/layouts/project-selector.tsx:76"
        origin="base"
        note="What renders while the query is in flight, in place of the select."
      >
        <div className="bg-neutral-5 h-5 w-48 animate-pulse rounded-full" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// pages/organization.tsx:224 and pages/project.tsx:237
// Same control, same options; only the last description differs. The trigger echoes the option
// label, so no `label` override is needed.
// ---------------------------------------------------------------------------

const DAYS = 30;

function SortSelect(props: { scope: 'project' | 'target' }) {
  const [sortBy, setSortBy] = useState('requests');

  return (
    <Select
      options={[
        {
          value: 'requests',
          label: 'Requests',
          description: `GraphQL requests made in the last ${DAYS} days.`,
        },
        {
          value: 'versions',
          label: 'Schema Versions',
          description: `Schemas published in last ${DAYS} days.`,
        },
        { value: 'name', label: 'Name', description: `Sort by ${props.scope} name.` },
      ]}
      value={sortBy}
      onValueChange={setSortBy}
    />
  );
}

export const SortSelects = createPreview({
  label: 'Sort selects',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite source="pages/organization.tsx:224" origin="base">
        <SortSelect scope="project" />
      </CallSite>
      <CallSite
        source="pages/project.tsx:237"
        origin="base"
        note="Used to override its trigger to transparent; the two pages now match."
      >
        <SortSelect scope="target" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/Permissions.tsx:44
// Options are computed from the whole list: `noDowngrade` disables anything below the member's
// current scope and gives it a "Can't downgrade" description. Trigger, popup and options carry
// `data-cy`, which `e2e/helpers/usage.ts` reads.
// ---------------------------------------------------------------------------

const NO_ACCESS = 'no-access';

function LegacyScopePicker(props: { noDowngrade?: boolean; disabled?: boolean }) {
  const initialScope = 'read-only';
  const [value, setValue] = useState(initialScope);
  const all = [
    { value: NO_ACCESS, label: 'No access' },
    { value: 'read-only', label: 'Read-only' },
    { value: 'read-write', label: 'Read & write' },
  ];

  return (
    <Select
      options={all.map(item => {
        const isDisabled =
          props.noDowngrade === true
            ? all.findIndex(i => i.value === item.value) <
              all.findIndex(i => i.value === initialScope)
            : false;

        return {
          value: item.value,
          label: item.label,
          disabled: isDisabled,
          description: isDisabled ? "Can't downgrade" : undefined,
          'data-cy': `select-option-${item.value}`,
        };
      })}
      disabled={props.disabled}
      value={value}
      onValueChange={setValue}
      width="sm"
      data-cy="select-trigger"
      popupDataCy="target-select-content"
    />
  );
}

function PermissionRowSelect() {
  const [value, setValue] = useState('not-selected');

  return (
    <Select
      options={[
        { value: 'not-selected', label: 'Not Selected' },
        { value: 'allow', label: 'Allow' },
      ]}
      value={value}
      onValueChange={setValue}
      width="sm"
    />
  );
}

export const PermissionSelects = createPreview({
  label: 'Permission selects',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite source="components/organization/Permissions.tsx:44" origin="base">
        <LegacyScopePicker />
      </CallSite>
      <CallSite
        source="components/organization/Permissions.tsx:44"
        origin="base"
        note="noDowngrade: options below the member's current scope are disabled and explain themselves on a second line."
      >
        <LegacyScopePicker noDowngrade />
      </CallSite>
      <CallSite
        source="components/organization/Permissions.tsx:89"
        origin="base"
        note="Disabled outright when the viewer cannot manage the scope. The whole row is then wrapped in a tooltip that says why."
      >
        <LegacyScopePicker disabled />
      </CallSite>
      <CallSite
        source="components/organization/members/permission-selector.tsx:220"
        origin="base"
        note="Two fixed options, one per permission row, disabled when the permission is read-only or has an unmet dependency."
      >
        <PermissionRowSelect />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/layouts/target.tsx:369 and :391
// The CDN artifact modal. Two selects that constrain each other: picking a non-default graph
// disables every artifact except `sdl` and `supergraph`.
// ---------------------------------------------------------------------------

function CdnArtifactSelects() {
  const [selectedGraph, setSelectedGraph] = useState('DEFAULT_GRAPH');
  const [selectedArtifact, setSelectedArtifact] = useState('sdl');
  const artifacts = [
    { value: 'sdl', label: 'GraphQL SDL' },
    { value: 'supergraph', label: 'Supergraph' },
    { value: 'services', label: 'Services Definition' },
    { value: 'metadata', label: 'Metadata' },
  ];

  return (
    <div className="mb-5 mt-1 flex flex-row justify-start gap-3">
      <div>
        <Select
          options={[
            { value: 'DEFAULT_GRAPH', label: 'Default Graph' },
            { value: 'public-api', label: 'public-api' },
            { value: 'partner-api', label: 'partner-api' },
          ]}
          value={selectedGraph}
          onValueChange={value => {
            if (
              value !== 'DEFAULT_GRAPH' &&
              selectedArtifact !== 'sdl' &&
              selectedArtifact !== 'supergraph'
            ) {
              setSelectedArtifact('sdl');
            }
            setSelectedGraph(value);
          }}
          placeholder="Select Graph"
          width="lg"
        />
      </div>
      <div>
        <Select
          options={artifacts.map(t => ({
            value: t.value,
            label: t.label,
            disabled:
              t.value !== 'supergraph' && t.value !== 'sdl' && selectedGraph !== 'DEFAULT_GRAPH',
          }))}
          value={selectedArtifact}
          onValueChange={setSelectedArtifact}
          placeholder="Select Artifact"
          width="lg"
        />
      </div>
    </div>
  );
}

export const CdnArtifactModal = createPreview({
  label: 'CDN artifact modal',
  render: () => (
    <CallSite
      source="components/layouts/target.tsx:369, :394"
      origin="base"
      note="Pick a non-default graph and the artifact options collapse to SDL and Supergraph. Nothing explains why the others went grey."
    >
      <CdnArtifactSelects />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// The three create-token sheets, identical in all three files. The react-hook-form field is
// mapped explicitly (value / onValueChange / onBlur / name); `FormControl` puts its id on the
// trigger so the `FormLabel` resolves.
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
      <label className="text-neutral-12 text-sm font-medium" htmlFor="expirationPeriod">
        Expiration
      </label>
      <Select
        options={EXPIRATION_PERIODS.map(c => ({ value: c.value, label: c.name }))}
        value={value}
        onValueChange={setValue}
        id="expirationPeriod"
        name="expirationPeriod"
        width="full"
      />
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
      source="create-access-token-sheet-content.tsx:270 (and the personal + project sheets)"
      origin="base"
      note="Three byte-identical copies inside a ui/sheet, so this is also where the sheet's portal container gets exercised in the app."
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
  const viewerCanShare = true;

  return (
    <div className="bg-neutral-2 dark:bg-neutral-4 border-neutral-5 w-80 rounded-md border p-4 shadow-md">
      <Select
        options={[
          { value: 'private', label: 'My views' },
          ...(viewerCanShare ? [{ value: 'shared', label: 'Shared views' }] : []),
        ]}
        value={visibility}
        onValueChange={setVisibility}
        placeholder="Save location"
        onSurface="raised"
        width="full"
      />
    </div>
  );
}

function CollectionSelect() {
  const [value, setValue] = useState('');
  const collections = [
    { id: 'c1', name: 'Onboarding', description: 'Queries used in the getting-started guide' },
    {
      id: 'c2',
      name: 'Regression',
      description:
        'Operations we replay before every release, including the long tail of edge cases that only show up under load',
    },
    { id: 'c3', name: 'Scratch', description: '' },
  ];

  return (
    <div className="w-96">
      <Select
        options={collections.map(c => ({
          value: c.id,
          label: c.name,
          description: c.description,
          'data-cy': 'collection-select-item',
        }))}
        value={value}
        onValueChange={setValue}
        placeholder="Select a Collection"
        matchTriggerWidth
        width="full"
        data-cy="collection-select-trigger"
      />
    </div>
  );
}

function ServiceSelect(props: { empty?: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectableServices = (props.empty ? [] : ['products', 'reviews', 'inventory'])
    .filter(s => !selected.includes(s))
    .map(s => ({ value: s, label: s }));

  return (
    <div className="flex grow flex-row items-center gap-3">
      <Select
        options={selectableServices}
        value=""
        onValueChange={s => setSelected(prev => [...prev, s])}
        label="Select a service..."
        disabled={selectableServices.length === 0}
        width="md"
      />
      {selected.length ? (
        <span className="text-neutral-11 text-xs">Added: {selected.join(', ')}</span>
      ) : null}
    </div>
  );
}

export const OneOffs = createPreview({
  label: 'One-offs',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/insights/save-filter-button.tsx:204"
        origin="base"
        note='The one onSurface="raised" in the app: it sits inside a Popover, drawn here as the same floating surface.'
      >
        <SaveLocationSelect />
      </CallSite>
      <CallSite
        source="components/target/laboratory/create-operation-modal.tsx:226"
        origin="base"
        note="The only popup sized to its trigger rather than its content. Descriptions are user-written and truncate; one is empty."
      >
        <CollectionSelect />
      </CallSite>
      <CallSite
        source="components/target/proposals/editor.tsx:451"
        origin="base"
        note='Held at value="" forever: each pick adds a service rather than selecting one, and the trigger keeps its prompt text.'
      >
        <ServiceSelect />
      </CallSite>
      <CallSite
        source="components/target/proposals/editor.tsx:456"
        origin="base"
        note="Disabled when there is nothing left to add."
      >
        <ServiceSelect empty />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/project/alerts/create-alert.tsx and create-channel.tsx
// Formik forms inside v2/modal. Were native <select>s (v2/select) until round 3. Errors show as
// the line under the field; there is no invalid state on the control itself.
// ---------------------------------------------------------------------------

function ChannelTypeSelect(props: { showError?: boolean }) {
  const [type, setType] = useState('');
  const error = props.showError && !type ? 'Must select type' : null;

  return (
    <div className="flex w-[450px] flex-col gap-4">
      <label className="text-sm font-semibold" htmlFor="type">
        Type
      </label>
      <Select
        id="type"
        name="type"
        value={type}
        onValueChange={setType}
        placeholder="Select channel type"
        options={[
          { value: 'SLACK', label: 'Slack' },
          { value: 'WEBHOOK', label: 'Webhook' },
          { value: 'MSTEAMS_WEBHOOK', label: 'MS Teams Webhook' },
          { value: 'DISCORD', label: 'Discord Webhook' },
        ]}
        width="full"
      />
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}

export const AlertForms = createPreview({
  label: 'Alert forms',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/project/alerts/create-channel.tsx:154"
        origin="base"
        note="create-alert.tsx has three of these in a row (type, channel, target) with the same label and error slot."
      >
        <ChannelTypeSelect />
      </CallSite>
      <CallSite
        source="components/project/alerts/create-channel.tsx:169"
        origin="base"
        note="The validation state: Formik's error line under an untouched required field after submit."
      >
        <ChannelTypeSelect showError />
      </CallSite>
    </div>
  ),
});
