import { useState } from 'react';
import { CircleXIcon, EraserIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { ScrollArea } from '../scroll-area/scroll-area';
import { Separator } from '../separator/separator';
import { focusRing } from '../shared-styles';
import { Collapsible } from './collapsible';

export const nav: NavPath = 'Base/Primitives/Collapsible/Component Examples';

/**
 * Both Collapsibles in the app. Neither page can be imported: the laboratory runs GraphiQL and
 * the traces filter column reads URL state.
 *
 * History: both were `ui/collapsible`, three bare re-exports of Radix, so each site built its
 * whole header itself. The traces one was assembled from the shadcn sidebar parts, deleted in
 * round 4 along with the sidebar; the laboratory one keyed a page style block on Radix's
 * `data-state` attribute.
 */

const ENTRIES = [
  {
    source: 'pages/target-laboratory.tsx:730',
    origin: 'base',
    what: 'Preflight Script Logs panel in the GraphiQL footer, variant=panel',
    coveredBy: 'Preflight logs',
  },
  {
    source: 'pages/traces/target-traces-filter.tsx:254',
    origin: 'base',
    what: 'Each group of the traces filter column, variant=section',
    coveredBy: 'Traces filter group',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/collapsible"
      summary={
        <>
          Two sites, one per variant: a titled <code>panel</code> with a clear action, and a
          filter-column <code>section</code> with a reset count.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

const PREFLIGHT_LOGS = [
  'log: preflight script executed in 12ms',
  'info: 1',
  'warn: true',
  'error: Fatal',
  'log: setting header x-tenant',
  'info: done',
  'log: preflight script executed in 9ms',
  'info: done',
];

/** PreflightLogs, with plain lines standing in for LogLine and the page's #preflight-logs style block absent. */
function PreflightLogs() {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="flex max-h-[200px] w-full flex-col overflow-hidden bg-[#030711]">
      <Collapsible
        variant="panel"
        trigger="Preflight Script Logs"
        open={isOpen}
        onOpenChange={setIsOpen}
        actions={
          isOpen ? (
            <Button layout="iconOnly" icon={EraserIcon} aria-label="Clear logs" variant="ghost" />
          ) : null
        }
        panelDataCy="logs"
      >
        <ScrollArea fill>
          <div className="p-4 font-mono text-xs/[18px]">
            {PREFLIGHT_LOGS.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </ScrollArea>
      </Collapsible>
    </div>
  );
}

export const PreflightLogsPreview = createPreview({
  label: 'Preflight logs',
  render: () => (
    <CallSite
      source="pages/target-laboratory.tsx:730"
      origin="base"
      note="The clear button is the actions slot and shows only while open; the log lines sit in a fill ScrollArea and follow their tail. The wrapper keeps the page's background and 200px cap."
    >
      <div className="w-[36rem]">
        <PreflightLogs />
      </div>
    </CallSite>
  ),
});

const STATUS_OPTIONS = [
  { label: 'ok', value: 'ok', count: 1204 },
  { label: 'error', value: 'error', count: 37 },
];

const filterRowClass = cn(
  'hover:bg-neutral-5/50 flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-colors',
  focusRing,
);

/** Filter and FilterOption from target-traces-filter.tsx, the Status group. The coloured status dot is left out. */
function TracesFilterGroup() {
  const [selected, setSelected] = useState<string[]>(['ok']);
  return (
    <div className="text-neutral-11 flex w-64 flex-col">
      <div className="px-2">
        <Collapsible
          trigger="Status"
          defaultOpen
          actions={
            selected.length ? (
              <button
                type="button"
                aria-label="Reset Status filter"
                className={cn(
                  'hover:bg-neutral-2 text-neutral-10 group ml-auto flex h-6 w-8 items-center justify-center rounded-md px-1 text-xs transition-colors',
                  focusRing,
                )}
                onClick={() => setSelected([])}
              >
                <CircleXIcon className="hidden size-3 group-hover:block" />
                <span className="block group-hover:hidden">{selected.length}</span>
              </button>
            ) : null
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-1 text-sm">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSelected(prev =>
                    prev.includes(option.value)
                      ? prev.filter(value => value !== option.value)
                      : prev.concat(option.value),
                  )
                }
                className={cn(filterRowClass, 'justify-between')}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Checkbox visual checked={selected.includes(option.value)} size="sm" />
                  {option.label}
                </div>
                <Badge variant="secondary" className="rounded-sm px-1 font-mono font-normal">
                  {formatNumber(option.count)}
                </Badge>
              </button>
            ))}
          </div>
        </Collapsible>
      </div>
      <Separator />
    </div>
  );
}

export const TracesFilterGroupPreview = createPreview({
  label: 'Traces filter group',
  render: () => (
    <CallSite
      source="pages/traces/target-traces-filter.tsx:254"
      origin="base"
      note="The reset count is the actions slot beside the trigger, a real button outside the trigger button. Rows are plain buttons; a base Separator follows each group."
    >
      <TracesFilterGroup />
    </CallSite>
  ),
});
