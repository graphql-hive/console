import { useState } from 'react';
import { Eraser } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { ScrollArea } from '../scroll-area/scroll-area';
import { Collapsible } from './collapsible';

export const nav: NavPath = 'Primitives/Collapsible';

const STATUS = [
  { label: 'ok', count: 1204 },
  { label: 'error', count: 37 },
];
const ERROR_CODES = [
  { label: 'GRAPHQL_VALIDATION_FAILED', count: 21 },
  { label: 'UNAUTHENTICATED', count: 9 },
  { label: 'INTERNAL_SERVER_ERROR', count: 7 },
];

function FilterRows(props: { rows: { label: string; count: number }[] }) {
  const [selected, setSelected] = useState(['ok']);
  return (
    <div className="flex w-full min-w-0 flex-col gap-1 text-sm">
      {props.rows.map(row => (
        <button
          key={row.label}
          type="button"
          className="flex h-8 w-full items-center justify-between gap-2 rounded-md p-2 text-left hover:bg-surface-hover"
          onClick={() =>
            setSelected(prev =>
              prev.includes(row.label) ? prev.filter(l => l !== row.label) : [...prev, row.label],
            )
          }
        >
          <span className="flex items-center gap-2">
            <Checkbox visual checked={selected.includes(row.label)} size="sm" />
            {row.label}
          </span>
          <span className="font-mono text-xs text-fg-secondary">{row.count}</span>
        </button>
      ))}
    </div>
  );
}

/** `section`: a group heading that toggles the list beneath it, stacked in a column. */
export const Section = createPreview(() => (
  <div className="flex w-64 flex-col gap-1 p-2 text-fg-default">
    <Collapsible trigger="Status" defaultOpen>
      <FilterRows rows={STATUS} />
    </Collapsible>
    <Collapsible trigger="Error Code">
      <FilterRows rows={ERROR_CODES} />
    </Collapsible>
  </div>
));

const LOGS = [
  'info: 1',
  'warn: true',
  'error: Fatal',
  'log: preflight script executed in 12ms',
  'log: setting header x-tenant',
  'info: done',
  'log: preflight script executed in 9ms',
  'info: done',
];

// `panel` as the laboratory's preflight logs use it: the clear button shows only while open.
export const Panel = createPreview(() => {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex max-h-[200px] w-[36rem] flex-col overflow-hidden rounded-md border border-line bg-neutral-1">
      <Collapsible
        variant="panel"
        trigger="Preflight Script Logs"
        open={open}
        onOpenChange={setOpen}
        actions={
          open ? (
            <Button layout="iconOnly" icon={Eraser} aria-label="Clear logs" variant="ghost" />
          ) : null
        }
      >
        <ScrollArea fill>
          <div className="p-4 font-mono text-xs/[18px] text-fg-default">
            {LOGS.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </ScrollArea>
      </Collapsible>
    </div>
  );
});

export const Controlled = createPreview(() => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-64 flex-col gap-3 text-sm text-fg-default">
      <Button variant="outline" onClick={() => setOpen(prev => !prev)}>
        {open ? 'Collapse' : 'Expand'} from outside
      </Button>
      <Collapsible trigger="Status" open={open} onOpenChange={setOpen}>
        <FilterRows rows={STATUS} />
      </Collapsible>
    </div>
  );
});

export const Playground = createPreview({
  controls: controlsFor(Collapsible, {
    variant: { type: 'radio', options: ['section', 'panel'], default: 'section' },
    trigger: { type: 'text', default: 'Status' },
    actions: {
      type: 'radio',
      options: ['none', 'clear'],
      default: 'none',
      derive: kind =>
        kind === 'clear' ? (
          <Button layout="iconOnly" icon={Eraser} aria-label="Clear" variant="ghost" />
        ) : undefined,
    },
    defaultOpen: { type: 'boolean', default: true },
  }),
  render: v => (
    <div
      className={
        v.variant === 'panel'
          ? 'w-[36rem] overflow-hidden rounded-md border border-line bg-neutral-1'
          : 'w-64 p-2 text-fg-default'
      }
    >
      {/* `defaultOpen` is read once at mount, so the key remounts on a change. */}
      <Collapsible
        key={String(v.defaultOpen)}
        variant={v.variant}
        trigger={v.trigger}
        actions={v.actions}
        defaultOpen={v.defaultOpen}
      >
        <div className={v.variant === 'panel' ? 'p-2' : undefined}>
          <FilterRows rows={STATUS} />
        </div>
      </Collapsible>
    </div>
  ),
});
