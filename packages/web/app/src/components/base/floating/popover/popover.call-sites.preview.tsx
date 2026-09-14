import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronDownIcon,
  ChevronsUpDown,
  ChevronUpIcon,
  X,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button as BaseButton } from '@/components/base/button/button';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Button } from '@/components/ui/button';
import { DateRangePicker, presetLast7Days, type Preset } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Menu } from '../menu/menu';
import { Select } from '../select/select';
import { itemVariants } from '../shared-styles';
import { Popover } from './popover';

export const nav: NavPath = 'Base/Floating/Popover/Component Examples';

/**
 * Every Popover call site in the app, transcribed with its real copy so a change to the component
 * can be judged against what actually ships. The date range picker is the real component, since
 * it runs no queries.
 *
 * History: all of these were `ui/popover` (Radix) until round 3, and six of them were `Popover` +
 * `cmdk` comboboxes that are now base Menu or Select. Two of those were dead, commented out at
 * their only mount, and were deleted rather than migrated: `VersionSelect` and `UserFilter`.
 */

const ENTRIES = [
  {
    source: 'components/target/explorer/common.tsx:469',
    origin: 'base',
    what: 'Type name, links into Explorer and Insights',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:363',
    origin: 'base',
    what: 'Operation hash, links to Insights per target',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:498, :628',
    origin: 'base',
    what: 'Affected operations list, width md, twice',
    coveredBy: 'Simple content',
  },
  {
    source: 'pages/target-checks-single.tsx:461',
    origin: 'base',
    what: 'All targets, scrolling list',
    coveredBy: 'Simple content',
  },
  {
    source: 'pages/target-checks-single.tsx:1508',
    origin: 'base',
    what: 'Approve schema check, width lg with arrow, controlled',
    coveredBy: 'Simple content',
  },
  {
    source: 'components/ui/changelog/changelog.tsx:57',
    origin: 'base',
    what: 'Latest changes, width xl, no padding, conditional trigger',
    coveredBy: 'Changelog',
  },
  {
    source: 'components/target/proposals/stage-filter.tsx:22',
    origin: 'base',
    what: 'Stage filter, now a Menu of checkbox rows',
    coveredBy: 'Checkbox filter',
  },
  {
    source: 'components/organization/members/common.tsx:31',
    origin: 'base',
    what: 'Role picker, now a Select with descriptions, tooltips and search',
    coveredBy: 'Pickers',
  },
  {
    source: 'components/target/proposals/stage-transition-select.tsx:63',
    origin: 'base',
    what: 'Stage transitions, now a Menu of actions',
    coveredBy: 'Pickers',
  },
  {
    source: 'pages/target.tsx:191',
    origin: 'base',
    what: 'Service picker, now a searchable Select',
    coveredBy: 'Pickers',
  },
  {
    source: 'components/target/settings/schema-contracts.tsx:531, :630',
    origin: 'base',
    what: 'Include / exclude tag lists anchored to a text field',
    coveredBy: 'Tag pickers',
  },
  {
    source: 'components/ui/date-range-picker.tsx:566',
    origin: 'base',
    what: 'The picker panel, modal, trigger falls back to a default',
    coveredBy: 'Date range picker',
  },
  {
    source: 'components/ui/date-range-picker.tsx:480',
    origin: 'base',
    what: 'Calendar anchored to the panel column, no trigger of its own',
    coveredBy: 'Date range picker',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/floating/popover"
      summary={
        <>
          16 live instances across 11 files: 12 on base Popover, 2 on base Menu, 2 on base Select.{' '}
          <code>ui/popover</code>, <code>ui/command</code>, <code>@radix-ui/react-popover</code> and{' '}
          <code>cmdk</code> are gone. The date range picker has 11 mounts across the app.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Plain content popovers: a link or button trigger, a small panel of text or links, sometimes an
// arrow.
// ---------------------------------------------------------------------------

function ApprovalPopover() {
  const [approvalOpen, setApprovalOpen] = useState(false);
  return (
    <Popover
      open={approvalOpen}
      onOpenChange={setApprovalOpen}
      trigger={
        <Button variant="destructive" disabled={approvalOpen}>
          Approve{' '}
          {approvalOpen ? (
            <ChevronUpIcon className="ml-2 size-4" />
          ) : (
            <ChevronDownIcon className="ml-2 size-4" />
          )}
        </Button>
      }
      width="lg"
      align="end"
      arrow
      content={
        <div className="space-y-3">
          <h4 className="text-neutral-12 text-sm font-medium">Approve failed schema check</h4>
          <p className="text-neutral-11 text-sm">
            Approving this check will mark the breaking changes as accepted for this context.
          </p>
          <Input placeholder="Approval reason (optional)" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApprovalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive">Approve</Button>
          </div>
        </div>
      }
    />
  );
}

export const SimpleContent = createPreview({
  label: 'Simple content',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/target/explorer/common.tsx:469"
        origin="base"
        note="Text trigger with a hover underline. Content is a pair of links, each with a hint."
      >
        <Popover
          trigger={
            <button type="button" className="hover:underline hover:underline-offset-4">
              ProductConnection
            </button>
          }
          side="right"
          arrow
          content={
            <div className="flex flex-col gap-y-2">
              <p>
                <a
                  className="text-sm font-normal hover:underline hover:underline-offset-2"
                  href="#"
                >
                  Visit in <span className="font-bold">Explorer</span>
                </a>
                <span className="text-neutral-10 text-xs"> - displays a full type</span>
              </p>
              <p>
                <a
                  className="text-sm font-normal hover:underline hover:underline-offset-2"
                  href="#"
                >
                  Visit in <span className="font-bold">Insights</span>
                </a>
                <span className="text-neutral-10 text-xs"> - usage insights</span>
              </p>
            </div>
          }
        />
      </CallSite>

      <CallSite
        source="components/target/history/errors-and-changes.tsx:363"
        origin="base"
        note="Orange trigger text, sits inside a table cell."
      >
        <Popover
          trigger={
            <button
              type="button"
              className="text-orange-800 hover:text-orange-800 hover:underline-offset-4 dark:text-orange-500 dark:hover:text-orange-500"
            >
              a1b2_getProducts
            </button>
          }
          side="right"
          arrow
          content={
            <div className="flex flex-col gap-y-2 text-sm">
              View live usage on
              {['production', 'staging'].map(slug => (
                <p key={slug}>
                  <a className="text-accent_80 hover:text-accent" href="#">
                    {slug}
                  </a>{' '}
                  <span className="text-neutral-12">target</span>
                </p>
              ))}
            </div>
          }
        />
      </CallSite>

      <CallSite
        source="components/target/history/errors-and-changes.tsx:498"
        origin="base"
        note="Width md, a scrolling list capped at max-h-40 with a link underneath. The same block appears again at :628."
      >
        <Popover
          trigger={
            <Button variant="link" className="h-auto p-0">
              12 operations
            </Button>
          }
          side="left"
          width="md"
          arrow
          content={
            <div className="space-y-2">
              <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {['getProducts', 'getReviews', 'addToCart', '[anonymous] (9f3a11c2...)'].map(op => (
                  <li key={op} className="text-neutral-11">
                    {op}
                  </li>
                ))}
              </ul>
              <a className="text-accent block pt-2 text-sm hover:underline" href="#">
                Show all (12) affected operations
              </a>
            </div>
          }
        />
      </CallSite>

      <CallSite
        source="pages/target-checks-single.tsx:461"
        origin="base"
        note="Default width and padding; the content supplies its own p-2 and a ScrollArea at height=sm."
      >
        <Popover
          trigger={
            <Button variant="link" className="p-0">
              4 more
            </Button>
          }
          content={
            <div className="p-2">
              <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
              <ScrollArea height="sm">
                <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                  {['production', 'staging', 'development', 'canary', 'preview'].map(slug => (
                    <div key={slug} className="py-2">
                      <div className="text-neutral-10 line-clamp-3 text-sm">{slug}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          }
        />
      </CallSite>

      <CallSite
        source="pages/target-checks-single.tsx:1508"
        origin="base"
        note="Controlled, and the trigger disables itself while open. Width lg."
      >
        <ApprovalPopover />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/ui/changelog/changelog.tsx:57
// Conditional trigger: with no changes there is nothing to open it. Widest panel in the app.
// ---------------------------------------------------------------------------

export const Changelog = createPreview({
  label: 'Changelog',
  render: () => (
    <CallSite
      source="components/ui/changelog/changelog.tsx:57"
      origin="base"
      note="Width xl, no padding, collisionPadding 20. In the app the trigger is only rendered when there are changes."
    >
      <Popover
        trigger={
          <Button variant="outline" className="relative text-sm">
            Latest changes
            <div className="absolute right-0 top-0 -mr-1 -mt-1 flex size-2">
              <div className="bg-accent absolute inline-flex size-full animate-pulse rounded-full" />
            </div>
          </Button>
        }
        width="xl"
        padding="none"
        collisionPadding={20}
        arrow
        content={
          <>
            <div className="grid">
              <div className="space-y-2 p-4">
                <h4 className="text-neutral-12 text-sm font-medium leading-none">
                  What&apos;s new in Hive Console
                </h4>
                <p className="text-neutral-11 text-control">
                  Find out about the newest features, and enhancements
                </p>
              </div>
              <ol className="relative m-0">
                {[
                  { title: 'Metric alerts are generally available', date: '3 days ago' },
                  { title: 'Schema proposals now support stages', date: '2 weeks ago' },
                ].map(change => (
                  <li key={change.title} className="border-accent_80 border-l-2 pl-4">
                    <time className="text-neutral-10 mb-1 text-xs font-normal">{change.date}</time>
                    <h3 className="text-neutral-12 text-pretty text-base font-medium hover:underline">
                      <a href="#">{change.title}</a>
                    </h3>
                    <div className="text-neutral-11 mb-4 text-pretty text-sm font-normal">
                      A short description of the change.
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-row items-center justify-center">
              <Button variant="link" asChild className="text-neutral-11 text-left text-sm">
                <a href="#">View all updates</a>
              </Button>
            </div>
          </>
        }
      />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/target/proposals/stage-filter.tsx:22
// Was a Popover + cmdk list of checkboxes. Now a Menu: an All row in its own section, then one
// checkbox row per stage. The menu stays open across clicks.
// ---------------------------------------------------------------------------

function StageFilter() {
  const stages = ['draft', 'open', 'approved', 'implemented', 'closed'];
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const hasSelection = selectedStages.length !== 0;
  const allSelected = stages.every(s => selectedStages.includes(s));

  return (
    <Menu
      trigger={
        <BaseButton
          variant="ghost"
          label={hasSelection ? selectedStages.join(', ') : 'Stage'}
          rightIcon={{ icon: ChevronsUpDown, withSeparator: false }}
        />
      }
      align="start"
      minWidth="default"
      sections={[
        [
          {
            kind: 'checkbox',
            label: 'All',
            checked: allSelected,
            onCheckedChange: () => setSelectedStages(allSelected ? [] : [...stages]),
          },
        ],
        stages.map(stage => ({
          kind: 'checkbox' as const,
          label: stage,
          checked: selectedStages.includes(stage),
          onCheckedChange: () =>
            setSelectedStages(prev =>
              prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage],
            ),
        })),
      ]}
    />
  );
}

export const CheckboxFilter = createPreview({
  label: 'Checkbox filter',
  render: () => (
    <CallSite
      source="components/target/proposals/stage-filter.tsx:22"
      origin="base"
      note="The trigger echoes the selection as a comma-joined list. In the app each click updates the ?stage= search param."
    >
      <StageFilter />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// The three pickers that were Popover + cmdk comboboxes.
// ---------------------------------------------------------------------------

const ROLES = [
  { id: 'admin', name: 'Admin', description: 'Full access to the organization', canInvite: false },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Can publish schemas and manage targets',
    canInvite: true,
  },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access', canInvite: true },
];

function RoleSelector() {
  const [value, setValue] = useState('viewer');
  const [busy, setBusy] = useState(false);
  return (
    <Select
      options={ROLES.map(role => ({
        value: role.id,
        label: role.name,
        description: role.description,
        disabled: !role.canInvite,
        tooltip: role.canInvite ? undefined : 'Not enough permissions',
        'data-cy': 'role-selector-item',
      }))}
      value={value}
      onValueChange={next => {
        // The app awaits a mutation here and keeps the trigger disabled until it settles.
        setBusy(true);
        setTimeout(() => {
          setValue(next);
          setBusy(false);
        }, 600);
      }}
      placeholder="Select role"
      disabled={busy}
      searchable
      searchPlaceholder="Search roles..."
      align="end"
      data-cy="role-selector-trigger"
    />
  );
}

const STAGE_TITLES: Record<string, string> = {
  OPEN: 'READY FOR REVIEW',
  APPROVED: 'AWAITING IMPLEMENTATION',
  CLOSED: 'CANCELED',
  DRAFT: 'IN DRAFT',
  IMPLEMENTED: 'IMPLEMENTED',
};

const STAGE_TRANSITIONS = [
  { fromStates: ['OPEN', 'APPROVED'], value: 'DRAFT', label: 'REVERT TO DRAFT' },
  { fromStates: ['DRAFT'], value: 'OPEN', label: 'READY FOR REVIEW' },
  { fromStates: ['CLOSED'], value: 'DRAFT', label: 'REOPEN AS DRAFT' },
  { fromStates: ['CLOSED', 'APPROVED'], value: 'OPEN', label: 'REOPEN' },
  { fromStates: ['OPEN'], value: 'APPROVED', label: 'APPROVE FOR IMPLEMENTING' },
  { fromStates: ['DRAFT', 'OPEN', 'APPROVED'], value: 'CLOSED', label: 'CANCEL PROPOSAL' },
];

function StageTransitionSelect() {
  const [stage, setStage] = useState('OPEN');
  return (
    <Menu
      trigger={
        <BaseButton
          variant="outline"
          label={STAGE_TITLES[stage]}
          rightIcon={{ icon: ChevronsUpDown, withSeparator: false }}
        />
      }
      align="end"
      minWidth="default"
      sections={[
        STAGE_TRANSITIONS.filter(s => s.fromStates.includes(stage)).map(s => ({
          label: s.label,
          onClick: () => setStage(s.value),
        })),
      ]}
    />
  );
}

function ServicePicker() {
  const [service, setService] = useState<string | undefined>(undefined);
  const services = [
    { service: 'products', url: 'http://localhost:4001/graphql' },
    { service: 'reviews', url: 'http://localhost:4002/graphql' },
    { service: 'inventory', url: 'http://localhost:4003/graphql' },
    { service: 'users', url: 'http://localhost:4004/graphql' },
    { service: 'notifications', url: 'http://localhost:4005/graphql' },
  ];
  return (
    <div className="flex flex-row items-center gap-x-4">
      <Select
        options={services.map(s => ({ value: s.service, label: s.service, description: s.url }))}
        value={service}
        onValueChange={setService}
        placeholder="Select service"
        searchable
        searchPlaceholder="Search service..."
        width="lg"
      />
      {service ? (
        <Button variant="outline" onClick={() => setService(undefined)}>
          <X width={16} height={16} />
        </Button>
      ) : null}
    </div>
  );
}

export const Pickers = createPreview({
  label: 'Pickers',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/organization/members/common.tsx:31"
        origin="base"
        note="Descriptions, a disabled row with a tooltip saying why, a busy state while the mutation settles, search kept, Playwright hooks on trigger and items."
      >
        <RoleSelector />
      </CallSite>
      <CallSite
        source="components/target/proposals/stage-transition-select.tsx:63"
        origin="base"
        note="A Menu of actions: the rows are the transitions legal from the current stage, so the list changes shape as you use it."
      >
        <StageTransitionSelect />
      </CallSite>
      <CallSite
        source="pages/target.tsx:191"
        origin="base"
        note="Federation projects only. Service URL as the description, a search on top, and a separate reset button beside the trigger once something is picked."
      >
        <ServicePicker />
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/target/settings/schema-contracts.tsx:531 and :630
// A tag list anchored to a text field: opens on focus, closes on outside press or Escape, keeps
// the caret in the field. Every tag on the latest version, with a check on the picked ones; it
// never filters by what is typed. Interim until the base Combobox in round 9.
// ---------------------------------------------------------------------------

function TagPicker(props: { label: string }) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const all = ['public', 'internal', 'experimental', 'deprecated'];
  const add = () => {
    if (value) {
      setTags(prev => (prev.includes(value) ? prev : [...prev, value]));
      setValue('');
    }
  };
  const toggle = (tag: string) =>
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-semibold">{props.label} Tags</label>
      <div className="flex">
        <div className="flex-1">
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              ref={setInput}
              autoComplete="off"
              placeholder={`Add ${props.label.toLowerCase()}d tag`}
              value={value}
              onChange={e => setValue(e.target.value)}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <Button type="button" onClick={add} disabled={value === ''}>
              Add
            </Button>
          </div>
          <Popover
            open={open}
            onOpenChange={setOpen}
            anchor={input}
            align="start"
            initialFocus={false}
            padding="none"
            width="auto"
            content={
              <div className="w-[200px] p-1">
                <div className="text-neutral-10 px-2 py-1.5 text-xs font-medium">
                  Tags from latest schema version
                </div>
                {all.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={itemVariants({
                      selected: tags.includes(tag),
                      className: 'hover:bg-neutral-5 hover:text-neutral-12 w-full',
                    })}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        tags.includes(tag) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {tag}
                  </button>
                ))}
              </div>
            }
          />
        </div>
        <div className="flex-1 pl-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="bg-neutral-4 text-neutral-12 mr-1 inline-block cursor-pointer rounded-sm px-2 py-0.5 text-xs"
              onClick={() => toggle(tag)}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export const TagPickers = createPreview({
  label: 'Tag pickers',
  render: () => (
    <CallSite
      source="components/target/settings/schema-contracts.tsx:531"
      origin="base"
      note="The same block again at :630 for excluded tags. Focus the field to open; Add and Enter add what you typed as a chip; a row toggles a suggested tag; the caret never leaves the field."
    >
      <TagPicker label="Include" />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/ui/date-range-picker.tsx:566 and :480
// The real component. The outer popover is modal; inside it, the calendar popover has no trigger
// and is anchored to the left column, opened by the calendar button in From or To.
// ---------------------------------------------------------------------------

function PickerHarness(props: { trigger?: 'default' | 'insights'; align?: 'start' | 'end' }) {
  const [preset, setPreset] = useState<Preset>(presetLast7Days);
  return (
    <DateRangePicker
      selectedRange={preset.range}
      onUpdate={args => setPreset(args.preset)}
      startDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 90)}
      validUnits={['y', 'M', 'w', 'd', 'h']}
      align={props.align ?? 'start'}
      trigger={
        props.trigger === 'insights' ? (
          <BaseButton
            label={preset.label}
            variant="default"
            size="compact"
            rightIcon={{ icon: ChevronDown, withSeparator: true }}
          />
        ) : undefined
      }
    />
  );
}

export const DateRange = createPreview({
  label: 'Date range picker',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="components/ui/date-range-picker.tsx:566"
        origin="base"
        note="No trigger passed, so the picker's own outline button renders. Open it, then click the calendar icon in From: the calendar opens to the left of the panel."
      >
        <PickerHarness />
      </CallSite>
      <CallSite
        source="pages/target-insights.tsx:308"
        origin="base"
        note="The insights filter row passes its own compact segmented trigger. Six of the eleven mounts pass a trigger like this; the other five take the default button, and five pass align='end'."
      >
        <PickerHarness trigger="insights" align="end" />
      </CallSite>
    </div>
  ),
});
