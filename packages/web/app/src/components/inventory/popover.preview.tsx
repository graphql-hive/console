import { useState } from 'react';
import { CalendarDays, CalendarIcon, ChevronsUpDown, SearchIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CallSite, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Popover';

/**
 * Every `ui/popover` call site in the app, rendered with the **old** component and its real copy,
 * so the base replacement can be judged against what ships today.
 *
 * The pages themselves cannot be imported: they run GraphQL queries, mount Formik or
 * react-hook-form, and several sit behind permission flags. Each preview reproduces the call
 * site's trigger and content and holds open state locally.
 *
 * Seven of these are `Popover` + `Command` comboboxes, which is the whole reason `ui/command.tsx`
 * and the `cmdk` dependency exist. Nothing else imports it, so both fall out with this migration.
 */

const ENTRIES = [
  {
    source: 'components/target/explorer/common.tsx:469',
    origin: 'ui',
    what: 'Type name, links into Explorer',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:363',
    origin: 'ui',
    what: 'Operation hash, links to Insights',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:492',
    origin: 'ui',
    what: 'Affected operations list, w-80',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:620',
    origin: 'ui',
    what: 'Second affected-operations popover',
    coveredBy: 'Simple content',
  },
  {
    source: 'pages/target-checks-single.tsx:461',
    origin: 'ui',
    what: 'All targets, scrolling list',
    coveredBy: 'Simple content',
  },
  {
    source: 'pages/target-checks-single.tsx:1508',
    origin: 'ui',
    what: 'Approve schema check, w-[450px] with arrow',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/ui/changelog/changelog.tsx:57',
    origin: 'ui',
    what: 'Latest changes, w-[550px], conditional trigger',
  },
  {
    source: 'components/target/proposals/stage-filter.tsx:19',
    origin: 'ui',
    what: 'Stage filter, checkbox list',
    coveredBy: 'Checkbox filters',
  },
  {
    source: 'components/target/proposals/user-filter.tsx:74',
    origin: 'ui',
    what: 'Proposed-by filter, checkbox list with search',
    coveredBy: 'Checkbox filters',
  },
  {
    source: 'pages/target.tsx:199',
    origin: 'ui',
    what: 'Service picker combobox, w-[400px] with search',
    coveredBy: 'Comboboxes',
  },
  {
    source: 'components/target/proposals/version-select.tsx:45',
    origin: 'ui',
    what: 'Version picker, three-column rows',
    coveredBy: 'Comboboxes',
  },
  {
    source: 'components/target/proposals/stage-transition-select.tsx:64',
    origin: 'ui',
    what: 'Stage transition picker',
    coveredBy: 'Comboboxes',
  },
  {
    source: 'components/organization/members/common.tsx:47',
    origin: 'ui',
    what: 'Role picker, descriptions and disabled rows',
    coveredBy: 'Comboboxes',
  },
  {
    source: 'components/target/settings/schema-contracts.tsx:446',
    origin: 'ui',
    what: 'Include-tags suggestions, autofocus suppressed',
    coveredBy: 'Tag suggestions',
  },
  {
    source: 'components/target/settings/schema-contracts.tsx:559',
    origin: 'ui',
    what: 'Exclude-tags suggestions, same shape',
    coveredBy: 'Tag suggestions',
  },
  {
    source: 'components/ui/date-range-picker.tsx:368',
    origin: 'ui',
    what: 'Calendar anchored to a sibling panel, no trigger of its own',
    coveredBy: 'Date range picker',
  },
  {
    source: 'components/ui/date-range-picker.tsx:557',
    origin: 'ui',
    what: 'Outer picker, modal, trigger falls back to a default',
    coveredBy: 'Date range picker',
  },
  {
    source: 'pages/traces/target-traces-filter.tsx:561',
    origin: 'ui',
    what: 'Custom range calendar, revealed by the preset select',
    coveredBy: 'Date range picker',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/popover"
      summary={
        <>
          18 instances across 14 files. Seven are <code>Popover</code> + <code>Command</code>{' '}
          comboboxes, the only consumers of <code>ui/command.tsx</code> and <code>cmdk</code>. Every
          raw-content call site sets its own width, which today&apos;s{' '}
          <code>base/floating/popover</code> only supports in structured mode.{' '}
          <code>PopoverAnchor</code> has exactly one user and <code>PopoverArrow</code> four.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Plain content popovers. The common shape: a link or button trigger, a small panel of text or
// links, sometimes an arrow. Widths run w-80, w-[450px] and unset.
// ---------------------------------------------------------------------------

export const SimpleContent = createPreview({
  label: 'Simple content',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/explorer/common.tsx:469"
        origin="ui"
        note="Trigger is bare text with a hover underline, not a Button. Content is a pair of links. Note the source renders PopoverContent before PopoverTrigger."
      >
        <Popover>
          <PopoverTrigger className="hover:underline hover:underline-offset-4">
            ProductConnection
          </PopoverTrigger>
          <PopoverContent side="right">
            <div className="flex flex-col gap-y-2">
              <p>
                <a className="text-sm font-normal hover:underline" href="#">
                  Visit in <span className="font-bold">Explorer</span>
                </a>
              </p>
              <p>
                <a className="text-sm font-normal hover:underline" href="#">
                  Visit in <span className="font-bold">Insights</span>
                </a>
              </p>
            </div>
            <PopoverArrow />
          </PopoverContent>
        </Popover>
      </CallSite>

      <CallSite
        source="components/target/history/errors-and-changes.tsx:363"
        origin="ui"
        note="Orange trigger text, sits inside a table cell."
      >
        <Popover>
          <PopoverTrigger className="text-orange-800 hover:underline-offset-4 dark:text-orange-500">
            a1b2_getProducts
          </PopoverTrigger>
          <PopoverContent side="right">
            <div className="flex flex-col gap-y-2 text-sm">
              View live usage on
              <p>
                <a className="text-accent_80 hover:text-accent" href="#">
                  production
                </a>
              </p>
              <p>
                <a className="text-accent_80 hover:text-accent" href="#">
                  staging
                </a>
              </p>
            </div>
            <PopoverArrow />
          </PopoverContent>
        </Popover>
      </CallSite>

      <CallSite
        source="components/target/history/errors-and-changes.tsx:492"
        origin="ui"
        note="w-80, a scrolling list capped at max-h-40 with a link underneath."
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="h-auto p-0">
              12 operations
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" className="w-80">
            <div className="space-y-2">
              <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {['getProducts', 'getReviews', 'addToCart', '[anonymous] (9f3a11c2...)'].map(op => (
                  <li key={op} className="text-neutral-11">
                    {op}
                  </li>
                ))}
              </ul>
              <a className="text-accent_80 hover:text-accent text-sm" href="#">
                View app version
              </a>
            </div>
            <PopoverArrow />
          </PopoverContent>
        </Popover>
      </CallSite>

      <CallSite
        source="pages/target-checks-single.tsx:461"
        origin="ui"
        note="No width set, so it takes the Radix default. Content supplies its own p-2 and a fixed-height ScrollArea."
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="p-0">
              4 more
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="p-2">
              <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
              <ScrollArea className="h-44 w-full">
                <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                  {['production', 'staging', 'development', 'canary', 'preview'].map(slug => (
                    <div key={slug} className="py-2">
                      <div className="text-neutral-10 line-clamp-3 text-sm">{slug}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </CallSite>

      <CallSite
        source="pages/target-checks-single.tsx:1508"
        origin="ui"
        note="Controlled, and the trigger disables itself while open. The widest raw popover in the app at 450px, past the w-96 top of today's base width scale."
      >
        <ApprovalPopover />
      </CallSite>
    </div>
  ),
});

function ApprovalPopover() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="destructive" disabled={open}>
          Approve
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px]" align="end">
        <PopoverArrow />
        <div className="space-y-3">
          <h4 className="text-neutral-12 text-sm font-medium">Approve failed schema check</h4>
          <p className="text-neutral-11 text-sm">
            Approving this check will mark the breaking changes as accepted for this context.
          </p>
          <Input placeholder="Approval reason (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Approve</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// components/ui/changelog/changelog.tsx:57
// The only popover whose trigger is conditional: with no changes the trigger is not rendered at
// all, so the popover exists with nothing to open it. Widest in the app at 550px.
// ---------------------------------------------------------------------------

export const Changelog = createPreview({
  label: 'Changelog',
  render: () => (
    <CallSite
      source="components/ui/changelog/changelog.tsx:57"
      origin="ui"
      note="collisionPadding={20} and a conditional trigger. base/floating/popover requires `trigger`, so this call site needs it optional."
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative text-sm">
            Latest changes
            <div className="absolute right-0 top-0 -mr-1 -mt-1 flex size-2">
              <div className="bg-accent absolute inline-flex size-full animate-pulse rounded-full" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[550px] p-0" collisionPadding={20}>
          <PopoverArrow />
          <div className="grid">
            <div className="space-y-2 p-4">
              <h4 className="text-neutral-12 font-medium leading-none">
                What&apos;s new in Hive Console
              </h4>
              <p className="text-neutral-11 text-sm">
                Find out about the newest features, and enhancements
              </p>
            </div>
            <ol className="relative m-0">
              {[
                { title: 'Metric alerts are generally available', date: '3 days ago' },
                { title: 'Schema proposals now support stages', date: '2 weeks ago' },
              ].map(change => (
                <li key={change.title} className="border-accent_80 border-l-2 pl-4">
                  <div className="py-2 pr-4">
                    <div className="text-neutral-12 text-sm font-medium">{change.title}</div>
                    <div className="text-neutral-10 text-xs">{change.date}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </PopoverContent>
      </Popover>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// The two proposal filters. Label plus a comma-joined summary of the selection, then a checkbox
// list. This is base Menu's `kind: 'checkbox'` shape rather than a Popover.
// ---------------------------------------------------------------------------

function CheckboxFilter(props: { label: string; options: string[]; searchable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = props.options.every(o => selected.includes(o));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          className="flex justify-between"
          aria-expanded={open}
        >
          {selected.length > 0 ? selected.join(', ') : props.label}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[180px] truncate p-0">
        <Command>
          {props.searchable ? <CommandInput placeholder="Search org members..." /> : null}
          <CommandGroup>
            <ScrollArea className="relative max-h-screen">
              <CommandItem
                value=""
                onSelect={() => setSelected(allSelected ? [] : [...props.options])}
                className="cursor-pointer truncate border-b"
              >
                <div className="flex flex-row items-center gap-1.5">
                  <Checkbox size="sm" checked={allSelected} />
                  All
                </div>
              </CommandItem>
              {props.options.map(option => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() =>
                    setSelected(prev =>
                      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option],
                    )
                  }
                  className="cursor-pointer truncate"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <Checkbox size="sm" checked={selected.includes(option)} />
                    {option}
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const CheckboxFilters = createPreview({
  label: 'Checkbox filters',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/proposals/stage-filter.tsx:19"
        origin="ui"
        note="Hand-rolled: Checkbox inside a CommandItem, plus an All row that toggles everything. base Menu already does this with kind: 'checkbox'."
      >
        <CheckboxFilter label="Stage" options={['Draft', 'In review', 'Approved', 'Closed']} />
      </CallSite>
      <CallSite
        source="components/target/proposals/user-filter.tsx:74"
        origin="ui"
        note="Same shape with a search input. No width class, so it sizes to content."
      >
        <CheckboxFilter
          label="Proposed by"
          options={['User', 'Ada Lovelace', 'Grace Hopper']}
          searchable
        />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The four Popover + Command comboboxes. These become base Select, not base Popover, which is why
// finishing this stage lets `ui/command.tsx` and `cmdk` go.
// ---------------------------------------------------------------------------

function Combobox(props: {
  triggerLabel: string;
  triggerVariant: 'outline' | 'link';
  triggerClass: string;
  contentClass: string;
  align?: 'start' | 'end';
  searchPlaceholder?: string;
  items: { value: string; label: string; description?: string; disabled?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={props.triggerVariant}
          role="combobox"
          className={props.triggerClass}
          aria-expanded={open}
        >
          <span className="truncate">
            {props.items.find(i => i.value === value)?.label ?? props.triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={props.align ?? 'start'} className={props.contentClass}>
        <Command>
          {props.searchPlaceholder ? <CommandInput placeholder={props.searchPlaceholder} /> : null}
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="relative max-h-80">
                {props.items.map(item => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    onSelect={() => {
                      setValue(item.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div className="flex flex-col items-start">
                      <span>{item.label}</span>
                      {item.description ? (
                        <span className="text-neutral-10 text-xs">{item.description}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const Comboboxes = createPreview({
  label: 'Comboboxes',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target.tsx:199"
        origin="ui"
        note="w-[400px] on both trigger and panel, with a search input and a separate reset button beside the trigger."
      >
        <Combobox
          triggerLabel="Select service"
          triggerVariant="outline"
          triggerClass="w-[400px] justify-between"
          contentClass="w-[400px] truncate p-0"
          searchPlaceholder="Search service..."
          items={[
            { value: 'products', label: 'products' },
            { value: 'reviews', label: 'reviews' },
            { value: 'inventory', label: 'inventory' },
          ]}
        />
      </CallSite>
      <CallSite
        source="components/target/proposals/version-select.tsx:45"
        origin="ui"
        note="Rows are commit / time / author, and each option's value is the PREVIOUS edge's cursor because of how pagination reads. Does not fit a flat label + description."
      >
        <Combobox
          triggerLabel="Invalid version"
          triggerVariant="link"
          triggerClass="flex min-w-[50px] max-w-[420px] justify-between"
          contentClass="min-w-fit max-w-[100vw] truncate p-0"
          items={[
            { value: 'v3', label: '9f3a11c', description: '2 hours ago · User' },
            { value: 'v2', label: 'a1b2c3d', description: '1 day ago · Ada Lovelace' },
            { value: 'v1', label: 'c4d5e6f', description: '3 days ago · Grace Hopper' },
          ]}
        />
      </CallSite>
      <CallSite
        source="components/target/proposals/stage-transition-select.tsx:64"
        origin="ui"
        note="Options are filtered by which transitions are legal from the current stage, so the list changes shape as you use it."
      >
        <Combobox
          triggerLabel="In review"
          triggerVariant="outline"
          triggerClass="flex min-w-[200px] justify-between truncate"
          contentClass="truncate p-0"
          align="end"
          items={[
            { value: 'approved', label: 'Approve' },
            { value: 'closed', label: 'Close' },
          ]}
        />
      </CallSite>
      <CallSite
        source="components/organization/members/common.tsx:47"
        origin="ui"
        note="The most demanding one: descriptions, disabled rows with a tooltip explaining why, a busy state, and data-cy on trigger and items that Playwright reads."
      >
        <Combobox
          triggerLabel="Select role"
          triggerVariant="outline"
          triggerClass="flex w-[400px] items-center justify-between"
          contentClass="w-[400px] p-0"
          align="end"
          searchPlaceholder="Search roles..."
          items={[
            { value: 'admin', label: 'Admin', description: 'Full access to the organization' },
            { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
            {
              value: 'owner',
              label: 'Owner',
              description: 'Cannot be assigned',
              disabled: true,
            },
          ]}
        />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/target/settings/schema-contracts.tsx:446 and :559
// A suggestion popover attached to a text input. `onOpenAutoFocus` is prevented so opening the
// list does not steal focus from the field the user is still typing in.
// ---------------------------------------------------------------------------

function TagSuggestions(props: { label: string }) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            autoComplete="off"
            placeholder={props.label}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (value) {
                  setTags(prev => [...prev, value]);
                  setValue('');
                }
              }
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" onOpenAutoFocus={ev => ev.preventDefault()}>
        <Command>
          <CommandList>
            <CommandGroup heading="Tags from latest schema version">
              {['public', 'internal', 'experimental', 'deprecated'].map(tag => (
                <CommandItem
                  key={tag}
                  value={tag}
                  onSelect={() =>
                    setTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
                    )
                  }
                  className="cursor-pointer"
                >
                  <Checkbox size="sm" checked={tags.includes(tag)} />
                  <span className="ml-1.5">{tag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const TagSuggestionPopovers = createPreview({
  label: 'Tag suggestions',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/settings/schema-contracts.tsx:446"
        origin="ui"
        note="The trigger is an Input, not a button. Typing must keep focus, which is what onOpenAutoFocus prevention buys. base/floating/popover has no equivalent yet."
      >
        <TagSuggestions label="Include tags" />
      </CallSite>
      <CallSite
        source="components/target/settings/schema-contracts.tsx:559"
        origin="ui"
        note="Byte-identical apart from include/exclude."
      >
        <TagSuggestions label="Exclude tags" />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// The date range pickers. The hardest call sites in this migration.
// ---------------------------------------------------------------------------

const QUICK_RANGES = [
  'Last 24 hours',
  'Last 7 days',
  'Last 14 days',
  'Last 30 days',
  'Last 90 days',
  'Last 6 months',
  'Last 1 year',
];

/**
 * `DateRangePickerPanel`, the content of the outer popover. Two columns inside a fixed
 * `h-[380px]`: the absolute-range form on the left (which is also the anchor for the calendar
 * popover) and the filterable quick-range list on the right.
 */
function DateRangePickerPanel() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromValue, setFromValue] = useState('now-30d');
  const [toValue, setToValue] = useState('now');
  const [quickRangeFilter, setQuickRangeFilter] = useState('');
  const [activePreset, setActivePreset] = useState('Last 7 days');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Last 30 days</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex h-[380px]">
          <Popover modal open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverAnchor asChild>
              <div className="flex flex-col py-2">
                <div className="flex flex-col items-center justify-end gap-2 lg:flex-row lg:items-start">
                  <div className="flex flex-col gap-1 pl-3">
                    <div className="mb-2 mt-1 text-sm">Absolute date range</div>
                    <div className="space-y-2">
                      {[
                        { id: 'from', label: 'From', value: fromValue, set: setFromValue },
                        { id: 'to', label: 'To', value: toValue, set: setToValue },
                      ].map(field => (
                        <div key={field.id} className="grid w-full max-w-sm items-center gap-1.5">
                          <label className="text-neutral-10 text-xs" htmlFor={field.id}>
                            {field.label}
                          </label>
                          <div className="flex w-full max-w-sm items-center space-x-2">
                            <div className="relative flex w-full">
                              <Input
                                type="text"
                                id={field.id}
                                value={field.value}
                                onChange={ev => field.set(ev.target.value)}
                                className="font-mono text-xs"
                              />
                              <Button
                                variant="ghost"
                                className="absolute right-2 top-1/2 size-6 -translate-y-1/2 px-0"
                                onClick={() => setShowCalendar(true)}
                              >
                                <CalendarDays className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-red-500" />
                        </div>
                      ))}
                      <Button variant="primary" className="w-full text-center">
                        Apply date range
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverAnchor>
            <PopoverContent side="left" sideOffset={4} collisionPadding={8} className="w-auto">
              <div className="text-neutral-10 p-4 text-xs">
                react-day-picker calendar, with a close button pinned top-right.
              </div>
            </PopoverContent>
          </Popover>
          <div className="ml-3 flex flex-col gap-1 border-l py-2 pl-3 pr-2">
            <div className="relative flex items-center">
              <SearchIcon className="text-neutral-10 absolute left-2 size-3.5" />
              <Input
                placeholder="Filter quick ranges"
                className="w-full pl-7"
                value={quickRangeFilter}
                onChange={ev => setQuickRangeFilter(ev.target.value)}
              />
            </div>
            <div className="flex w-full flex-1 flex-col items-start gap-1 overflow-y-scroll pb-2 pt-1">
              {QUICK_RANGES.filter(preset =>
                preset.toLowerCase().includes(quickRangeFilter.toLowerCase().trim()),
              ).map(preset => (
                <Button
                  key={preset}
                  variant="ghost"
                  onClick={() => setActivePreset(preset)}
                  className={cn(
                    'w-full justify-start text-left',
                    preset === activePreset && 'bg-neutral-2',
                  )}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const DateRangePicker = createPreview({
  label: 'Date range picker',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/date-range-picker.tsx:557 and :368"
        origin="ui"
        note="The whole picker as it appears on the explorer filter. The outer Popover is `modal` and its trigger is `props.trigger ?? <default>`. Inside, the left column is the PopoverAnchor: the calendar popover has NO trigger of its own, positioning against that panel and opened by the calendar button inside a From or To field. Reached from 13 pages."
      >
        <DateRangePickerPanel />
      </CallSite>

      <CallSite
        source="pages/traces/target-traces-filter.tsx:561"
        origin="ui"
        note='Only revealed once the preset select is set to "Custom", so the popover and the select are one interaction across two components.'
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start px-2 text-left">
              <CalendarIcon className="mr-2 size-4" />
              <span className="text-xs">2026-09-01 → 2026-09-10</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <div className="text-neutral-10 p-4 text-xs">
              Calendar, then Start/End inputs below.
            </div>
          </PopoverContent>
        </Popover>
      </CallSite>
    </div>
  ),
});
