import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  GitCompare,
  Info,
  List,
} from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { FailureCard } from '../failure-card/failure-card';
import { Select } from '../floating/select/select';
import { Tooltip } from '../floating/tooltip/tooltip';
import { Legend } from '../legend/legend';
import { TabbedView, type TabbedViewItem } from './tabbed-view';

export const nav: NavPath = 'Components/TabbedView';

/**
 * Tabs in a header band, one view per tab in the body, and a picker leading the strip that
 * scopes every view. The schema check and schema version pages, which used to nest a contract
 * tab row above a view tab row.
 */

type ContractStatus = 'failed' | 'changed' | 'ok';

const CONTRACTS: Array<{ value: string; label: string; status: ContractStatus }> = [
  { value: 'default', label: 'Default Graph', status: 'failed' },
  { value: 'public-api', label: 'public-api', status: 'changed' },
  { value: 'partner-api', label: 'partner-api', status: 'ok' },
  { value: 'mobile', label: 'mobile', status: 'failed' },
];

const STATUS_LABEL: Record<ContractStatus, string> = {
  failed: 'Composition failed.',
  changed: 'Schema changed',
  ok: 'Composition succeeded.',
};

function StatusGlyph({ status }: { status: ContractStatus }) {
  if (status === 'failed') return <AlertTriangle className="text-critical size-3.5 shrink-0" />;
  if (status === 'changed') return <GitCompare className="size-3.5 shrink-0" />;
  return <Check className="text-success size-3.5 shrink-0" />;
}

/** The picker as the pages build it: the contract's name, its status under a tooltip at the far end. */
function ContractSelect(props: { value: string; onValueChange: (value: string) => void }) {
  return (
    <Select
      aria-label="Contract"
      options={CONTRACTS.map(entry => ({
        value: entry.value,
        label: entry.label,
        trailing: (
          <Tooltip
            trigger={
              <span className="inline-flex">
                <StatusGlyph status={entry.status} />
              </span>
            }
            content={STATUS_LABEL[entry.status]}
          />
        ),
      }))}
      value={props.value}
      onValueChange={props.onValueChange}
      size="compact"
      onSurface="raised"
      width="md"
    />
  );
}

function DetailsView({ contract }: { contract: string }) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <div>
        <div className="text-fg mb-3 flex items-center gap-2 font-medium">
          Breaking Changes
          <Info className="text-fg-secondary size-3.5" />
        </div>
        <div className="border-line flex items-center justify-between border-b py-2">
          <span className="text-fg-default">
            Field <Badge content="Node.id" variants={{ variant: 'secondary', mono: true }} />{' '}
            changed type from{' '}
            <Badge content="ID!" variants={{ variant: 'secondary', mono: true }} /> to{' '}
            <Badge content="ID" variants={{ variant: 'secondary', mono: true }} /> in {contract}
          </span>
          <ChevronDown className="text-fg-secondary size-4" />
        </div>
      </div>
      <div className="text-fg-default flex flex-col gap-2">
        <p>
          Get more out of schema checks by enabling conditional breaking changes based on usage
          data.
        </p>
        <a href="#" className="hover:text-fg inline-flex items-center gap-2">
          <BookOpen className="size-4" />
          Learn more about conditional breaking changes.
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function SchemaView() {
  return (
    <pre className="text-fg-default font-mono text-xs leading-relaxed">
      {'type Query {\n  node(id: ID!): Node\n  viewer: User\n}\n\ninterface Node {\n  id: ID\n}'}
    </pre>
  );
}

function checkViews(contract: string): TabbedViewItem[] {
  return [
    {
      value: 'details',
      label: 'Details',
      icon: List,
      content: <DetailsView contract={contract} />,
    },
    { value: 'schema', label: 'Public Schema', icon: GitCompare, content: <SchemaView /> },
    {
      value: 'supergraph',
      label: 'Supergraph',
      icon: GitCompare,
      disabled: true,
      tooltip: 'Composition did not succeed. No Supergraph available.',
      content: null,
    },
    { value: 'policy', label: 'Policy', icon: AlertTriangle, disabled: true, content: null },
  ];
}

export const Default = createPreview(() => {
  const [contract, setContract] = useState('default');
  return (
    <TabbedView
      items={checkViews(contract)}
      defaultValue="details"
      action={<ContractSelect value={contract} onValueChange={setContract} />}
    />
  );
});

/**
 * The schema check page around it, with its content mocked. The key to the picker's icons and
 * the FailureCard sit between the status card and the band; the card lists contracts only, since
 * the default graph's own failure is the view the page opens on.
 */
export const ChecksPage = createPreview(() => {
  const [contract, setContract] = useState('default');
  const failed = CONTRACTS.filter(entry => entry.value !== 'default' && entry.status === 'failed');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-fg text-xl font-medium">Check 5843350d-f323-4ff3-8dcf-a30bd48f451f</h2>
        <p className="text-fg-secondary text-sm">Detailed view of the schema check</p>
      </div>
      <div className="border-line bg-neutral-2 dark:bg-neutral-3 flex items-center justify-between rounded-md border px-5 py-4">
        <div className="flex gap-24">
          <div>
            <div className="text-fg-secondary text-xs">Status</div>
            <div className="text-critical text-sm font-medium">Failed</div>
          </div>
          <div>
            <div className="text-fg-secondary text-xs">Triggered 3d ago</div>
            <div className="text-fg text-sm">by User</div>
          </div>
        </div>
        <Button variant="destructive">Approve</Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Legend
            items={[
              { icon: <StatusGlyph status="failed" />, label: 'Failed' },
              { icon: <StatusGlyph status="changed" />, label: 'Schema changed' },
              { icon: <StatusGlyph status="ok" />, label: 'Passed' },
            ]}
          />
        </div>
        <FailureCard
          title={`${failed.length} of ${CONTRACTS.length - 1} contracts failed`}
          aside={`${CONTRACTS.length - 1 - failed.length} passed`}
          items={failed.map(entry => ({
            key: entry.value,
            label: entry.label,
            reason: STATUS_LABEL.failed,
            detail: '2 errors',
            onView: () => setContract(entry.value),
          }))}
        />
        <TabbedView
          items={checkViews(contract)}
          defaultValue="details"
          action={<ContractSelect value={contract} onValueChange={setContract} />}
        />
      </div>
    </div>
  );
});

/** Without a picker: the version page on a project with no contracts. */
export const NoAction = createPreview(() => (
  <TabbedView items={checkViews('the default graph')} defaultValue="details" />
));

export const Playground = createPreview({
  controls: controlsFor(TabbedView, {
    bodyPadding: { type: 'radio', options: ['default', 'none'], default: 'default' },
  }),
  render: v => (
    <TabbedView
      bodyPadding={v.bodyPadding}
      defaultValue="changes"
      items={[
        {
          value: 'changes',
          label: 'Changes',
          content: (
            <div className="text-fg-default divide-line divide-y text-sm">
              <div className="px-5 py-3">Field Node.id changed type from ID! to ID</div>
              <div className="px-5 py-3">Field User.email was removed</div>
            </div>
          ),
        },
        { value: 'schema', label: 'Schema', content: <SchemaView /> },
      ]}
    />
  ),
});
