import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Select, type SelectOption } from './select';

export const nav: NavPath = 'Base/Floating/Select';

const METRICS: SelectOption[] = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'LATENCY:p99', label: 'p99 latency' },
  { value: 'LATENCY:p95', label: 'p95 latency' },
];

const CLIENTS: SelectOption[] = [
  'Hive CLI',
  'hive-gateway',
  'graphql-yoga',
  'apollo-rover',
  'graphql-mesh',
  'cosmo-router',
  'federation-gateway',
  'stellate-edge',
  'grafbase-cli',
  'envelop-plugin',
].map(name => ({ value: name, label: name }));

const STATUS_DOT = 'size-2 rounded-full';

export const Default = createPreview(() => {
  const [value, setValue] = useState('TRAFFIC');
  return <Select options={METRICS} value={value} onValueChange={setValue} />;
});

export const Placeholder = createPreview(() => {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <Select options={METRICS} value={value} onValueChange={setValue} placeholder="Choose metric…" />
  );
});

/** `searchable` adds a filter input and a fixed-height scroll area to the popup. */
export const Searchable = createPreview(() => {
  const [value, setValue] = useState('Hive CLI');
  return <Select options={CLIENTS} value={value} onValueChange={setValue} searchable />;
});

export const WithIcons = createPreview(() => {
  const [value, setValue] = useState('healthy');
  return (
    <Select
      options={[
        {
          value: 'healthy',
          label: 'Healthy',
          icon: <span className={`bg-success ${STATUS_DOT}`} />,
        },
        {
          value: 'degraded',
          label: 'Degraded',
          icon: <span className={`bg-warning ${STATUS_DOT}`} />,
        },
        { value: 'down', label: 'Down', icon: <span className={`bg-critical ${STATUS_DOT}`} /> },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
});

export const CustomTrigger = createPreview(() => {
  const [value, setValue] = useState('TRAFFIC');
  return (
    <Select
      options={METRICS}
      value={value}
      onValueChange={setValue}
      trigger={
        <Button label={METRICS.find(o => o.value === value)?.label ?? 'Pick…'} variant="action" />
      }
    />
  );
});

export const Disabled = createPreview(() => <Select options={METRICS} value="TRAFFIC" disabled />);

// ---------------------------------------------------------------------------
// Added in round 3, each one a gap the inventory found across the 17 legacy call sites.
// ---------------------------------------------------------------------------

/**
 * `label` overrides the trigger text. The sort selects say "Requests" while the option reads
 * "Requests · GraphQL requests made in the last 30 days"; the proposals editor holds `value=""`
 * forever and reads "Select a service…" because it is an add action, not a selection.
 */
export const WithLabel = createPreview(() => {
  const [value, setValue] = useState('requests');
  return (
    <div className="flex items-center gap-6">
      <Select
        options={[
          { value: 'requests', label: 'Requests' },
          { value: 'versions', label: 'Schema Versions' },
          { value: 'name', label: 'Name' },
        ]}
        value={value}
        onValueChange={setValue}
        label={`Sort by ${value}`}
      />
      <Select
        options={[
          { value: 'products', label: 'products' },
          { value: 'reviews', label: 'reviews' },
        ]}
        value=""
        onValueChange={() => {}}
        label="Select a service…"
      />
    </div>
  );
});

/**
 * `description` is the second line under a label. The role picker, the two sort selects and the
 * collection picker all had one, hand-built as a nested div.
 */
export const WithDescriptions = createPreview(() => {
  const [value, setValue] = useState('requests');
  return (
    <Select
      options={[
        {
          value: 'requests',
          label: 'Requests',
          description: 'GraphQL requests made in the last 30 days.',
        },
        {
          value: 'versions',
          label: 'Schema Versions',
          description: 'Schemas published in last 30 days.',
        },
        { value: 'name', label: 'Name', description: 'Sort by project name.' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
});

/**
 * A disabled option keeps its description, so the reason it cannot be picked is on the row
 * rather than behind a hover. This replaces both the "Can't downgrade" inline note and the
 * wrapping tooltip the two legacy sites used.
 */
export const DisabledOptions = createPreview(() => {
  const [value, setValue] = useState('read-only');
  return (
    <Select
      options={[
        { value: 'no-access', label: 'No access', description: "Can't downgrade", disabled: true },
        { value: 'read-only', label: 'Read-only' },
        { value: 'read-write', label: 'Read & write' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
});

/**
 * Select owns its trigger widths; Button only knows `auto | full`. `sm`/`md`/`lg` are the three
 * fixed widths the legacy call sites used (150 / 200 / 250), `full` fills the container.
 */
/**
 * `size` is the shared `controlSize` ladder, passed through to the trigger Button. `default`
 * (36px) is what a select in a form gets; `compact` (30px) is for a select that sits in a filter
 * row beside chips and a date picker, which are 30px.
 */
export const Sizes = createPreview(() => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <span className="text-neutral-9 w-16 text-xs">default</span>
      <Select options={METRICS} value="TRAFFIC" />
      <Button variant="primary">Save</Button>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-neutral-9 w-16 text-xs">compact</span>
      <Select options={METRICS} value="TRAFFIC" size="compact" />
      <Button label="Filter" size="compact" />
    </div>
  </div>
));

export const Widths = createPreview(() => (
  <div className="flex w-[28rem] flex-col items-start gap-3">
    <Select options={METRICS} value="TRAFFIC" />
    <Select options={METRICS} value="TRAFFIC" width="sm" />
    <Select options={METRICS} value="TRAFFIC" width="md" />
    <Select options={METRICS} value="TRAFFIC" width="lg" />
    <Select options={METRICS} value="TRAFFIC" width="full" />
  </div>
));

/**
 * `matchTriggerWidth` pins the popup to the trigger, for a fixed-width trigger whose longest
 * option would otherwise push the panel wider than the control.
 */
export const MatchTriggerWidth = createPreview(() => {
  const [value, setValue] = useState('c1');
  const collections = [
    { value: 'c1', label: 'Onboarding', description: 'Queries used in the getting-started guide' },
    { value: 'c2', label: 'Regression', description: 'Operations replayed before every release' },
  ];
  return (
    <div className="flex items-start gap-6">
      <Select options={collections} value={value} onValueChange={setValue} width="sm" />
      <Select
        options={collections}
        value={value}
        onValueChange={setValue}
        width="sm"
        matchTriggerWidth
      />
    </div>
  );
});

/**
 * `onSurface="raised"` lifts the trigger's fill one step above a card or a floating panel, where
 * the base fill would match the surface and leave only a border. The two panels are the two
 * raised surfaces in the app, which differ in dark (a card is neutral-3, a popover neutral-4);
 * each holds a base trigger above a raised one.
 */
export const OnSurface = createPreview(() => {
  const [value, setValue] = useState('private');
  const options = [
    { value: 'private', label: 'My views' },
    { value: 'shared', label: 'Shared views' },
  ];
  const pair = (
    <>
      <Select options={options} value={value} onValueChange={setValue} />
      <Select options={options} value={value} onValueChange={setValue} onSurface="raised" />
    </>
  );
  return (
    <div className="flex flex-wrap gap-6">
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 flex w-[20rem] flex-col gap-3 rounded-md border p-4">
        <span className="text-neutral-11 text-xs">A card</span>
        {pair}
      </div>
      <div className="bg-neutral-2 dark:bg-neutral-4 border-neutral-5 flex w-[20rem] flex-col gap-3 rounded-md border p-4 shadow-md">
        <span className="text-neutral-11 text-xs">A floating panel</span>
        {pair}
      </div>
    </div>
  );
});
