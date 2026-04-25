import type { Story, StoryDefault } from '@ladle/react';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from './data-table';

export default {
  title: 'UI / DataTable',
} satisfies StoryDefault;

type Alert = {
  id: string;
  name: string;
  severity: 'Info' | 'Warning' | 'Critical';
  firedAt: string;
};

const sample: Alert[] = Array.from({ length: 47 }, (_, i) => ({
  id: `alert-${i + 1}`,
  name: `Alert rule #${i + 1}`,
  severity: (['Info', 'Warning', 'Critical'] as const)[i % 3],
  firedAt: new Date(Date.now() - i * 3600_000).toISOString(),
}));

const columnHelper = createColumnHelper<Alert>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => <span className="text-neutral-12 font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('severity', {
    header: 'Severity',
  }),
  columnHelper.accessor('firedAt', {
    header: 'Fired at',
    cell: info => <span className="text-neutral-10 font-mono text-xs">{info.getValue()}</span>,
  }),
];

export const Default: Story = () => (
  <div className="mx-auto max-w-3xl p-8">
    <DataTable data={sample} columns={columns} />
  </div>
);

export const Empty: Story = () => (
  <div className="mx-auto max-w-3xl p-8">
    <DataTable data={[]} columns={columns} emptyMessage="No alerts yet." />
  </div>
);

export const Expandable: Story = () => (
  <div className="mx-auto max-w-3xl p-8">
    <DataTable
      data={sample}
      columns={columns}
      renderSubComponent={row => (
        <div className="grid grid-cols-3 gap-6 p-4">
          <Detail label="Name" value={row.original.name} />
          <Detail label="Severity" value={row.original.severity} />
          <Detail label="Fired at" value={row.original.firedAt} />
        </div>
      )}
    />
  </div>
);

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-neutral-10 text-[11px] uppercase tracking-wider">{label}</div>
      <div className="text-neutral-12 text-sm">{value}</div>
    </div>
  );
}
