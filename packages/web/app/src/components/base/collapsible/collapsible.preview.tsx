import { useState } from 'react';
import { Eraser } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { ScrollArea } from '../scroll-area/scroll-area';
import { Separator } from '../separator/separator';
import { Collapsible } from './collapsible';

export const nav: NavPath = 'Base/Primitives/Collapsible';

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
  return (
    <ul className="flex w-full min-w-0 flex-col gap-1 text-sm">
      {props.rows.map(row => (
        <li key={row.label}>
          <button
            type="button"
            className="hover:bg-neutral-5/50 flex h-8 w-full items-center justify-between gap-2 rounded-md p-2 text-left"
          >
            <span className="flex items-center gap-2 overflow-hidden">
              <Checkbox visual checked={row.label === 'ok'} size="sm" />
              {row.label}
            </span>
            <span className="bg-neutral-4 text-neutral-11 text-2xs rounded-sm px-1 font-mono">
              {row.count}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * `section`: a heading row that toggles the list beneath it, as in the traces filter column.
 * The count at the trailing edge is an `actions` slot, outside the button, where the old markup
 * nested a button inside the trigger.
 */
export const Section = createPreview(() => (
  <div className="text-neutral-11 flex w-64 flex-col">
    <div className="p-2">
      <Collapsible
        trigger="Status"
        defaultOpen
        actions={<span className="text-neutral-10 text-2xs rounded-sm px-2 font-mono">1</span>}
      >
        <FilterRows rows={STATUS} />
      </Collapsible>
    </div>
    <Separator />
    <div className="p-2">
      <Collapsible trigger="Error Code">
        <FilterRows rows={ERROR_CODES} />
      </Collapsible>
    </div>
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

/**
 * `panel`: the header bar of a titled panel, as in the laboratory's preflight logs. The clear
 * button is an `actions` slot and shows only while open. The panel's own content decides how
 * it scrolls: here a `fill` ScrollArea inside a wrapper with a max height.
 */
export const Panel = createPreview(() => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-neutral-5 bg-neutral-1 flex max-h-[200px] w-[36rem] flex-col overflow-hidden rounded-md border">
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
          <div className="text-neutral-11 p-4 font-mono text-xs/[18px]">
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
    <div className="text-neutral-11 flex w-64 flex-col gap-3 text-sm">
      <Button variant="outline" onClick={() => setOpen(prev => !prev)}>
        {open ? 'Collapse' : 'Expand'} from outside
      </Button>
      <Collapsible trigger="Status" open={open} onOpenChange={setOpen}>
        <FilterRows rows={STATUS} />
      </Collapsible>
    </div>
  );
});
