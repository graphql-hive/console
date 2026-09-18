import { useState, type ReactNode } from 'react';
import { AlertTriangle, Box, Check, FileCode2, GitCompare, Layers, List } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Select } from '../floating/select/select';
import { Tooltip } from '../floating/tooltip/tooltip';
import { TabbedView, type TabbedViewItem } from './tabbed-view';

export const nav: NavPath = 'Base/Primitives/TabbedView/Component Examples';

/**
 * The two pages on TabbedView, transcribed with their real labels, hooks and disabled reasons.
 * Both run a query for the check or version, so the views are stood in by a line of text.
 *
 * History: until round 7 each page stacked two `ui/tabs` rows, a file-tab contract picker above a
 * boxed view strip. The picker is now the Select leading the band.
 */

const ENTRIES = [
  {
    source: 'pages/target-checks-single.tsx:879',
    origin: 'base',
    what: 'A schema check on the default graph: five views, e2e hooks on the tabs, disabled views explained',
    coveredBy: 'Schema check',
  },
  {
    source: 'pages/target-checks-single.tsx:1101',
    origin: 'base',
    what: 'The same check scoped to a contract: three views',
    coveredBy: 'Contract check',
  },
  {
    source: 'pages/target-history-schema-version.tsx:381',
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
          only federation projects can have, and it scopes every view. Monolithic schema versions
          render their summary without the band.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

function Copy({ children }: { children: ReactNode }) {
  return <p className="text-neutral-11 text-sm">{children}</p>;
}

function StatusIcon({ status, changedLabel }: { status: string; changedLabel: string }) {
  const [icon, label] =
    status === 'failed'
      ? [<AlertTriangle key="i" className="text-warning size-3.5" />, 'Composition failed.']
      : status === 'changed'
        ? [<GitCompare key="i" className="size-3.5" />, changedLabel]
        : [<Check key="i" className="text-success size-3.5" />, 'Composition succeeded.'];
  return <Tooltip trigger={<span className="inline-flex">{icon}</span>} content={label} />;
}

function ContractPicker(props: {
  value: string;
  onValueChange: (value: string) => void;
  contracts: Array<{ value: string; label: string; status: string }>;
  changedLabel: string;
}) {
  return (
    <Select
      value={props.value}
      onValueChange={props.onValueChange}
      options={props.contracts.map(entry => ({
        value: entry.value,
        label: entry.label,
        icon: <StatusIcon status={entry.status} changedLabel={props.changedLabel} />,
      }))}
      size="compact"
      onSurface="raised"
      width="md"
    />
  );
}

// ---------------------------------------------------------------------------
// pages/target-checks-single.tsx:879
// ---------------------------------------------------------------------------

const CHECK_CONTRACTS = [
  { value: 'default', label: 'Default Graph', status: 'failed' },
  { value: 'c1', label: 'public-api', status: 'changed' },
  { value: 'c2', label: 'partner-api', status: 'ok' },
];

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
          changedLabel="Schema changed"
        />
      }
      bodyPadding="none"
    />
  );
}

export const SchemaCheckPreview = createPreview({
  label: 'Schema check',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:879"
      origin="base"
      note="A failed check with two contracts. Public Schema and Supergraph are disabled because composition failed, and say so on hover. The body runs edge to edge; the details view pads itself, the SDL views bring their own header bar."
    >
      <SchemaCheck />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-checks-single.tsx:1101
// ---------------------------------------------------------------------------

function ContractCheck() {
  const [contract, setContract] = useState('c1');
  const [view, setView] = useState('details');
  return (
    <TabbedView
      value={view}
      onValueChange={setView}
      action={
        <ContractPicker
          value={contract}
          onValueChange={setContract}
          contracts={CHECK_CONTRACTS}
          changedLabel="Contract schema changed"
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
  );
}

export const ContractCheckPreview = createPreview({
  label: 'Contract check',
  render: () => (
    <CallSite
      source="pages/target-checks-single.tsx:1101"
      origin="base"
      note="The same check with a contract picked: no Service or Policy view, and the picker's changed label speaks of the contract."
    >
      <ContractCheck />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-history-schema-version.tsx:381
// ---------------------------------------------------------------------------

const VERSION_CONTRACTS = [
  { value: 'default', label: 'Default Graph', status: 'changed' },
  { value: 'v1', label: 'public-api@1a2b3c4d', status: 'ok' },
  { value: 'v2', label: 'partner-api@5e6f7a8b', status: 'failed' },
];

function SchemaVersion() {
  const [contract, setContract] = useState('default');
  const [view, setView] = useState('details');
  return (
    <TabbedView
      value={view}
      onValueChange={setView}
      action={
        <ContractPicker
          value={contract}
          onValueChange={setContract}
          contracts={VERSION_CONTRACTS}
          changedLabel="Main graph schema changed"
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
  );
}

export const SchemaVersionPreview = createPreview({
  label: 'Schema version',
  render: () => (
    <CallSite
      source="pages/target-history-schema-version.tsx:381"
      origin="base"
      note="A version on a federation project with two contract versions, each labelled name@id. The body keeps the default padding and each view stacks its sections at space-y-8."
    >
      <SchemaVersion />
    </CallSite>
  ),
});
