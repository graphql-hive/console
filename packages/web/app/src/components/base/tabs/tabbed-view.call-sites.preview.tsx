import { useState, type ReactNode } from 'react';
import { AlertTriangle, Box, Check, FileCode2, GitCompare, Layers, List } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { FailureCard } from '../failure-card/failure-card';
import { Select } from '../floating/select/select';
import { Tooltip } from '../floating/tooltip/tooltip';
import { Legend } from '../legend/legend';
import { TabbedView, type TabbedViewItem } from './tabbed-view';

export const nav: NavPath = 'Components/TabbedView/Component Examples';

/**
 * The two pages on TabbedView, transcribed with their real labels, hooks and disabled reasons.
 * Both run a query for the check or version, so the views are stood in by a line of text.
 *
 * History: until round 7 each page stacked two `ui/tabs` rows, a file-tab contract picker above a
 * boxed view strip. The picker is now the Select leading the band, with the selected item's status
 * glyph on its trigger; a legend explains the glyphs, and a FailureCard above the band names the
 * contracts that failed.
 */

const ENTRIES = [
  {
    source: 'pages/target-checks-single.tsx:883',
    origin: 'base',
    what: 'A schema check on the default graph: five views, e2e hooks on the tabs, disabled views explained',
    coveredBy: 'Schema check',
  },
  {
    source: 'pages/target-checks-single.tsx:1105',
    origin: 'base',
    what: 'The same check scoped to a contract: three views',
    coveredBy: 'Contract check',
  },
  {
    source: 'pages/target-history-schema-version.tsx:424',
    origin: 'base',
    what: 'A schema version on a federation project: four views, contract versions in the picker',
    coveredBy: 'Schema version',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/tabs/tabbed-view"
      summary={
        <>
          Three mounts on two pages. The picker only appears when the target has contracts, which
          only federation projects can have, and it scopes every view. Above the band, the same
          pages draw the legend for the picker's glyphs and, when a contract failed, the FailureCard
          that names it. Monolithic schema versions render their summary without the band.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

function Copy({ children }: { children: ReactNode }) {
  return <p className="text-neutral-11 text-sm">{children}</p>;
}

type Status = 'failed' | 'breaking' | 'changed' | 'ok';

type Contract = { value: string; label: string; status: Status; detail?: string };

/** The page's status helper: the glyph and the words for one outcome. */
function status(entry: Contract, changedLabel: string) {
  switch (entry.status) {
    case 'failed':
      return {
        icon: <AlertTriangle className="text-critical size-3.5" />,
        label: 'Composition failed.',
      };
    case 'breaking':
      return {
        icon: <AlertTriangle className="text-critical size-3.5" />,
        label: 'Unapproved breaking changes!',
      };
    case 'changed':
      return { icon: <GitCompare className="size-3.5" />, label: changedLabel };
    default:
      return { icon: <Check className="text-success size-3.5" />, label: 'Composition succeeded.' };
  }
}

const LEGEND = [
  { icon: <AlertTriangle className="text-critical size-3.5" />, label: 'Failed' },
  { icon: <GitCompare className="size-3.5" />, label: 'Schema changed' },
  { icon: <Check className="text-success size-3.5" />, label: 'Passed' },
];

function ContractPicker(props: {
  value: string;
  onValueChange: (value: string) => void;
  contracts: Contract[];
  changedLabel: (entry: Contract) => string;
}) {
  const selected = props.contracts.find(entry => entry.value === props.value) ?? props.contracts[0];
  return (
    <Select
      aria-label="Contract"
      value={props.value}
      onValueChange={props.onValueChange}
      label={
        <span className="inline-flex items-center gap-1.5">
          {status(selected, props.changedLabel(selected)).icon}
          {selected.label}
        </span>
      }
      options={props.contracts.map(entry => {
        const { icon, label } = status(entry, props.changedLabel(entry));
        return {
          value: entry.value,
          label: entry.label,
          trailing: (
            <Tooltip trigger={<span className="inline-flex">{icon}</span>} content={label} />
          ),
        };
      })}
      size="compact"
      onSurface="raised"
      width="md"
    />
  );
}

/** The legend, the card for the contracts that failed, and the band, spaced as the pages space them. */
function AboveTheBand(props: {
  contracts: Contract[];
  onView: (value: string) => void;
  children: ReactNode;
}) {
  const contracts = props.contracts.filter(entry => entry.value !== 'default');
  const failures = contracts.filter(
    entry => entry.status === 'failed' || entry.status === 'breaking',
  );
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex justify-end">
        <Legend items={LEGEND} />
      </div>
      {failures.length ? (
        <div className="mb-3">
          <FailureCard
            title={`${failures.length} of ${contracts.length} contracts failed`}
            aside={`${contracts.length - failures.length} passed`}
            items={failures.map(entry => ({
              key: entry.value,
              label: entry.label,
              reason: status(entry, '').label,
              detail: entry.detail,
              onView: () => props.onView(entry.value),
            }))}
          />
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// pages/target-checks-single.tsx:883
// ---------------------------------------------------------------------------

const CHECK_CONTRACTS: Contract[] = [
  { value: 'default', label: 'Default Graph', status: 'failed' },
  { value: 'c1', label: 'public-api', status: 'changed' },
  { value: 'c2', label: 'partner-api', status: 'breaking', detail: '1 breaking change' },
];

const checkChangedLabel = (entry: Contract) =>
  entry.value === 'default' ? 'Schema changed' : 'Contract schema changed';

function SchemaCheck() {
  const [contract, setContract] = useState('default');
  const [view, setView] = useState('details');
  const items: TabbedViewItem[] = [
    {
      value: 'details',
      label: 'Details',
      icon: List,
      attrs: { 'data-testid': 'details-view-btn' },
      content: <Copy>Composition errors, breaking and safe changes, policy warnings.</Copy>,
    },
    {
      value: 'service',
      label: 'Service',
      icon: GitCompare,
      attrs: { 'data-testid': 'service-view-btn' },
      content: <Copy>The service SDL, diffed against the baseline.</Copy>,
    },
    {
      value: 'schema',
      label: 'Public Schema',
      icon: GitCompare,
      attrs: { 'data-testid': 'schema-view-btn' },
      disabled: true,
      tooltip: 'Composition did not succeed. No public schema SDL available.',
      content: null,
    },
    {
      value: 'supergraph',
      label: 'Supergraph',
      icon: GitCompare,
      attrs: { 'data-testid': 'supergraph-view-btn' },
      disabled: true,
      tooltip: 'Composition did not succeed. No Supergraph available.',
      content: null,
    },
    {
      value: 'policy',
      label: 'Policy',
      icon: AlertTriangle,
      attrs: { 'data-testid': 'policy-view-btn' },
      content: <Copy>The schema policy editor, with the warnings annotated.</Copy>,
    },
  ];
  return (
    <AboveTheBand contracts={CHECK_CONTRACTS} onView={setContract}>
      <TabbedView
        items={items}
        value={view}
        onValueChange={value => {
          setView(value);
        }}
        action={
          <ContractPicker
            value={contract}
            onValueChange={setContract}
            contracts={CHECK_CONTRACTS}
            changedLabel={checkChangedLabel}
          />
        }
        bodyPadding="none"
      />
    </AboveTheBand>
  );
}

export const SchemaCheckPreview = createPreview({
  label: 'Schema check',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:883"
      origin="base"
      note="A failed check with two contracts, one of them failing on an unapproved breaking change: the legend, the card naming it, then the band with the default graph's glyph on the trigger. Public Schema and Supergraph are disabled because composition failed, and say so on hover. The body runs edge to edge; the details view pads itself, the SDL views bring their own header bar."
    >
      <SchemaCheck />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-checks-single.tsx:1105
// ---------------------------------------------------------------------------

function ContractCheck() {
  const [contract, setContract] = useState('c2');
  const [view, setView] = useState('details');
  return (
    <AboveTheBand contracts={CHECK_CONTRACTS} onView={setContract}>
      <TabbedView
        value={view}
        onValueChange={setView}
        action={
          <ContractPicker
            value={contract}
            onValueChange={setContract}
            contracts={CHECK_CONTRACTS}
            changedLabel={checkChangedLabel}
          />
        }
        bodyPadding="none"
        items={[
          {
            value: 'details',
            label: 'Details',
            icon: List,
            content: <Copy>Breaking and safe changes of the contract.</Copy>,
          },
          {
            value: 'schema',
            label: 'Public Schema',
            icon: GitCompare,
            content: <Copy>The contract's public schema, diffed against its baseline.</Copy>,
          },
          {
            value: 'supergraph',
            label: 'Supergraph',
            icon: GitCompare,
            disabled: true,
            tooltip: 'Composition did not succeed. No Supergraph available.',
            content: null,
          },
        ]}
      />
    </AboveTheBand>
  );
}

export const ContractCheckPreview = createPreview({
  label: 'Contract check',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:1105"
      origin="base"
      note="The same check after View on the card, or a pick in the list: the failing contract on the trigger, no Service or Policy view, and the picker's changed label speaks of the contract."
    >
      <ContractCheck />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-history-schema-version.tsx:424
// ---------------------------------------------------------------------------

const VERSION_CONTRACTS: Contract[] = [
  { value: 'default', label: 'Default Graph', status: 'changed' },
  { value: 'v1', label: 'public-api@1a2b3c4d', status: 'ok' },
  { value: 'v2', label: 'partner-api@5e6f7a8b', status: 'failed', detail: '1 error' },
];

const versionChangedLabel = (entry: Contract) =>
  entry.value === 'default' ? 'Main graph schema changed' : 'Contract schema changed';

function SchemaVersion() {
  const [contract, setContract] = useState('default');
  const [view, setView] = useState('details');
  return (
    <AboveTheBand contracts={VERSION_CONTRACTS} onView={setContract}>
      <TabbedView
        value={view}
        onValueChange={setView}
        action={
          <ContractPicker
            value={contract}
            onValueChange={setContract}
            contracts={VERSION_CONTRACTS}
            changedLabel={versionChangedLabel}
          />
        }
        items={[
          {
            value: 'details',
            label: 'Summary',
            icon: List,
            content: <Copy>Changes introduced by this version, and the subgraph overview.</Copy>,
          },
          {
            value: 'full-schema',
            label: 'Schema',
            icon: FileCode2,
            content: <Copy>The public GraphQL schema: changes, diff or raw.</Copy>,
          },
          {
            value: 'supergraph',
            label: 'Supergraph',
            icon: Layers,
            content: <Copy>How the supergraph consumed by the router is affected.</Copy>,
          },
          {
            value: 'service-schema',
            label: 'Subgraphs',
            icon: Box,
            content: <Copy>Per-subgraph state and changes introduced by this version.</Copy>,
          },
        ]}
      />
    </AboveTheBand>
  );
}

export const SchemaVersionPreview = createPreview({
  label: 'Schema version',
  render: () => (
    <CallSite
      source="pages/target-history-schema-version.tsx:424"
      origin="base"
      note="A version on a federation project with two contract versions, each labelled name@id, one of which failed to compose. A version knows one failure reason only. The body keeps the default padding and each view stacks its sections at space-y-8."
    >
      <SchemaVersion />
    </CallSite>
  ),
});
