import { useState } from 'react';
import {
  CalendarDays,
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/v2';
import { cn } from '@/lib/utils';

export default {
  title: 'Old Popover Usages',
} satisfies StoryDefault;

// ---------------------------------------------------------------------------
// 1. target-checks-single / "More targets" list
// ---------------------------------------------------------------------------
const MOCK_TARGETS = [
  'production',
  'staging',
  'development',
  'preview-us-east',
  'preview-eu-west',
  'canary',
  'load-test',
];

export const TargetChecksSingle_MoreTargets: Story = () => (
  <div className="p-8">
    <p className="text-neutral-11 text-sm">
      Conditional breaking changes detected in{' '}
      <span className="text-neutral-12">production</span>,{' '}
      <span className="text-neutral-12">staging</span>,{' '}
      <span className="text-neutral-12">development</span>
      {' and '}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="link" className="p-0">
            {MOCK_TARGETS.length - 3} more
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="p-2">
            <h4 className="text-neutral-12 mb-2 text-sm font-semibold">All Targets</h4>
            <ScrollArea className="h-44 w-full">
              <div className="divide-neutral-5 grid grid-cols-1 divide-y">
                {MOCK_TARGETS.map((target, index) => (
                  <div key={index} className="py-2">
                    <div className="text-neutral-10 line-clamp-3 text-sm">{target}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// 2. target-checks-single / "Approve Failed Schema Check"
// ---------------------------------------------------------------------------
export const TargetChecksSingle_ApproveSchemaCheck: Story = () => {
  const [approvalOpen, setApprovalOpen] = useState(false);
  return (
    <div className="flex justify-end p-8">
      <Popover open={approvalOpen} onOpenChange={setApprovalOpen}>
        <PopoverTrigger asChild>
          <Button variant="destructive" disabled={approvalOpen}>
            Approve{' '}
            {approvalOpen ? (
              <ChevronUp className="ml-2 size-4" />
            ) : (
              <ChevronDown className="ml-2 size-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px]" align="end">
          <PopoverArrow />
          <div className="space-y-4">
            <h4 className="text-neutral-12 text-sm font-semibold">Approve Failed Schema Check</h4>
            <p className="text-neutral-11 text-sm">
              This will mark the schema check as approved despite having breaking changes.
            </p>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Input id="comment" placeholder="Reason for approving..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => setApprovalOpen(false)}>
                Confirm Approval
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. errors-and-changes / Operation hash link
// ---------------------------------------------------------------------------
const MOCK_OP_TARGETS = [
  { slug: 'production', targetSlug: 'production' },
  { slug: 'staging', targetSlug: 'staging' },
];

export const ErrorsAndChanges_OperationHashLink: Story = () => (
  <div className="p-8">
    <table className="text-sm">
      <thead>
        <tr className="text-neutral-10 border-b">
          <th className="w-[150px] py-2 text-left">Operation Name</th>
          <th className="py-2 text-right">Total Requests</th>
          <th className="py-2 text-right">% of traffic</th>
        </tr>
      </thead>
      <tbody>
        {[
          { hash: 'abc123def456', name: 'GetUser', count: '12,345', pct: '45.2%' },
          { hash: 'xyz789ghi012', name: 'ListOrders', count: '8,901', pct: '32.6%' },
        ].map(op => (
          <tr key={op.hash} className="border-b">
            <td className="py-2 font-medium">
              <Popover>
                <PopoverTrigger className="text-orange-800 hover:text-orange-800 hover:underline-offset-4 dark:text-orange-500 dark:hover:text-orange-500">
                  {op.hash.substring(0, 4)}_{op.name}
                </PopoverTrigger>
                <PopoverContent side="right">
                  <div className="flex flex-col gap-y-2 text-sm">
                    View live usage on
                    {MOCK_OP_TARGETS.map((target, i) => (
                      <p key={i}>
                        <a
                          className="text-neutral-2 hover:text-neutral-2"
                          href="#"
                          onClick={e => e.preventDefault()}
                        >
                          {target.slug}
                        </a>{' '}
                        <span className="text-neutral-12">target</span>
                      </p>
                    ))}
                  </div>
                  <PopoverArrow />
                </PopoverContent>
              </Popover>
            </td>
            <td className="py-2 text-right">{op.count}</td>
            <td className="py-2 text-right">{op.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ---------------------------------------------------------------------------
// 4. errors-and-changes / Affected app deployment operations
// ---------------------------------------------------------------------------
const MOCK_AFFECTED_OPS = [
  { hash: 'op1hash', name: 'GetUser' },
  { hash: 'op2hash', name: 'ListProducts' },
  { hash: 'op3hash', name: '' },
  { hash: 'op4hash', name: 'UpdateCart' },
];

export const ErrorsAndChanges_AffectedDeploymentOps: Story = () => (
  <div className="p-8">
    <table className="text-sm">
      <thead>
        <tr className="text-neutral-10 border-b">
          <th className="w-[200px] py-2 text-left">App Name</th>
          <th className="py-2">Version</th>
          <th className="py-2 text-right">Affected Operations</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b">
          <td className="py-2 font-medium">
            <a href="#" className="text-neutral-11 hover:text-neutral-12">
              my-web-app
            </a>
          </td>
          <td className="py-2">v2.3.1</td>
          <td className="py-2 text-right">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" className="h-auto p-0">
                  {MOCK_AFFECTED_OPS.length} operations
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-80">
                <div className="space-y-2">
                  <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {MOCK_AFFECTED_OPS.map(op => (
                      <li key={op.hash} className="text-neutral-11">
                        {op.name || `[anonymous] (${op.hash.substring(0, 8)}...)`}
                      </li>
                    ))}
                  </ul>
                  <a href="#" className="text-neutral-2 block pt-2 text-sm hover:underline">
                    Show all ({MOCK_AFFECTED_OPS.length}) affected operations
                  </a>
                </div>
                <PopoverArrow />
              </PopoverContent>
            </Popover>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

// ---------------------------------------------------------------------------
// 5. explorer/common / GraphQL type link
// ---------------------------------------------------------------------------
export const SchemaExplorer_GraphQLTypeLink: Story = () => (
  <div className="p-8">
    <p className="text-neutral-11 text-sm">
      Field type:{' '}
      <Popover>
        <PopoverTrigger className="hover:underline hover:underline-offset-4">[User!]!</PopoverTrigger>
        <PopoverContent side="right">
          <div className="flex flex-col gap-y-2">
            <p>
              <a className="text-sm font-normal hover:underline hover:underline-offset-2" href="#">
                Visit in <span className="font-bold">Explorer</span>
              </a>
              <span className="text-neutral-10 text-xs"> - displays a full type</span>
            </p>
            <p>
              <a className="text-sm font-normal hover:underline hover:underline-offset-2" href="#">
                Visit in <span className="font-bold">Insights</span>
              </a>
              <span className="text-neutral-10 text-xs"> - usage insights</span>
            </p>
          </div>
          <PopoverArrow />
        </PopoverContent>
      </Popover>
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// 6. changelog / Changelog popover
// ---------------------------------------------------------------------------
const MOCK_CHANGES = [
  {
    title: 'Schema Proposals',
    description: 'Collaborate on schema changes with proposals workflow.',
    href: '#1',
    date: '2025-01-15',
  },
  {
    title: 'App Deployments Tracking',
    description: 'Track which operations are used by specific app versions.',
    href: '#2',
    date: '2025-01-08',
  },
  {
    title: 'Conditional Breaking Changes',
    description: 'Detect breaking changes that only affect unused operations.',
    href: '#3',
    date: '2024-12-20',
  },
];

export const Changelog_LatestChanges: Story = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex justify-center p-8">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                What's new in GraphQL Hive
              </h4>
              <p className="text-neutral-11 text-sm">
                Find out about the newest features, and enhancements
              </p>
            </div>
            <ol className="relative m-0">
              {MOCK_CHANGES.map((change, index) => (
                <li className="border-accent_80 border-l-2 pl-4" key={index}>
                  <time className="text-neutral-10 mb-1 text-xs font-normal">{change.date}</time>
                  <h3 className="text-neutral-12 text-pretty text-base font-medium hover:underline">
                    <a href={change.href}>{change.title}</a>
                  </h3>
                  <div className="text-neutral-11 mb-4 text-pretty text-sm font-normal">
                    {change.description}
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. organization/members/common / Role Selector
// ---------------------------------------------------------------------------
const MOCK_ROLES = [
  { id: '1', name: 'Admin', description: 'Full access to the organization' },
  { id: '2', name: 'Member', description: 'Can view and manage projects' },
  { id: '3', name: 'Viewer', description: 'Read-only access to all resources' },
  { id: '4', name: 'Billing Manager', description: 'Manage billing and subscription' },
];

export const OrgMembers_RoleSelector: Story = () => {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(MOCK_ROLES[1]);

  return (
    <div className="p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center"
            data-cy="role-selector-trigger"
          >
            <span className="flex grow truncate" title={selectedRole.name}>
              {selectedRole.name}
            </span>
            <ChevronDown className="text-neutral-10 ml-2 size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Search roles..." />
            <CommandList>
              <CommandEmpty>No roles found.</CommandEmpty>
              <CommandGroup>
                {MOCK_ROLES.map(role => (
                  <CommandItem
                    key={role.id}
                    value={`${role.name} - ${role.description}`}
                    data-cy="role-selector-item"
                    onSelect={() => {
                      setSelectedRole(role);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer flex-col items-start space-y-1 px-4 py-2"
                  >
                    <p>{role.name}</p>
                    <p className="text-neutral-10 text-sm">{role.description}</p>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 8. date-range-picker / Date Range Picker
// ---------------------------------------------------------------------------
const MOCK_PRESETS = [
  { name: '1h', label: 'Last 1 hour' },
  { name: '6h', label: 'Last 6 hours' },
  { name: '12h', label: 'Last 12 hours' },
  { name: '1d', label: 'Last 1 day' },
  { name: '7d', label: 'Last 7 days' },
  { name: '14d', label: 'Last 14 days' },
  { name: '30d', label: 'Last 30 days' },
];

export const DateRangePicker_Presets: Story = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(MOCK_PRESETS[3]);

  return (
    <div className="p-8">
      <Popover
        modal
        open={isOpen}
        onOpenChange={(open: boolean) => {
          setIsOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline">
            {activePreset.label}
            <div className="-mr-2 scale-125 pl-1 opacity-60">
              {isOpen ? <ChevronUp width={24} /> : <ChevronDown width={24} />}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="mt-1 flex h-[380px] w-auto p-0">
          <div className="flex flex-col py-2">
            <div className="flex flex-col items-center justify-end gap-2 lg:flex-row lg:items-start">
              <div className="flex flex-col gap-1 pl-3">
                <div className="mb-2 text-sm">Absolute date range</div>
                <div className="space-y-2">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="from" className="text-neutral-10 text-xs">
                      From
                    </Label>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                      <div className="relative flex w-full">
                        <Input
                          type="text"
                          id="from"
                          defaultValue="now-1d"
                          className="font-mono"
                        />
                        <Button
                          variant="ghost"
                          className="absolute right-2 top-1/2 size-6 -translate-y-1/2 px-0"
                        >
                          <CalendarDays className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="to" className="text-neutral-10 text-xs">
                      To
                    </Label>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                      <div className="relative flex w-full">
                        <Input type="text" id="to" defaultValue="now" className="font-mono" />
                        <Button
                          variant="ghost"
                          className="absolute right-2 top-1/2 size-6 -translate-y-1/2 px-0"
                        >
                          <CalendarDays className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full text-center">Apply date range</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-3 flex flex-col gap-1 border-l py-2 pl-3 pr-2">
            <div className="relative flex items-center">
              <Input placeholder="Filter quick ranges" className="w-full" />
            </div>
            <div className="flex w-full flex-1 flex-col items-start gap-1 overflow-y-scroll pb-2 pt-1">
              {MOCK_PRESETS.map(preset => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-left',
                    activePreset.name === preset.name && 'bg-neutral-4',
                  )}
                  onClick={() => {
                    setActivePreset(preset);
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 9. target.tsx / Service selector (Schema View)
// ---------------------------------------------------------------------------
const MOCK_SERVICES = [
  { service: 'users', url: 'https://api.example.com/users' },
  { service: 'products', url: 'https://api.example.com/products' },
  { service: 'orders', url: 'https://api.example.com/orders' },
  { service: 'payments', url: 'https://api.example.com/payments' },
  { service: 'notifications', url: 'https://api.example.com/notifications' },
  { service: 'analytics', url: 'https://api.example.com/analytics' },
];

export const TargetSchemaView_ServiceSelector: Story = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-x-4 p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-[400px] justify-between"
            aria-expanded={open}
          >
            {selected ?? 'Select service'}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {selected ? (
          <Button variant="outline" onClick={() => setSelected(null)}>
            <X width={16} height={16} />
          </Button>
        ) : null}
        <PopoverContent className="w-[400px] truncate p-0">
          <Command>
            <CommandInput className="w-[400px]" placeholder="Search service..." />
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="relative h-80 w-full">
                {MOCK_SERVICES.map(schema => (
                  <CommandItem
                    key={schema.service}
                    value={schema.service}
                    onSelect={val => {
                      setSelected(val);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex cursor-pointer flex-col items-start space-y-1 px-4 py-2',
                      selected === schema.service && 'bg-neutral-4',
                    )}
                  >
                    <div>
                      <div>{schema.service}</div>
                      <div className="text-neutral-10 text-xs">{schema.url}</div>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 10. target-traces-filter / Timeline calendar filter
// ---------------------------------------------------------------------------
export const TracesFilter_TimelineCalendar: Story = () => {
  const [isOpen, setIsOpen] = useState(false);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  return (
    <div className="p-8">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start px-2 text-left">
            <CalendarIcon className="mr-2 size-4" />{' '}
            <span className="text-xs">
              {yesterday.toLocaleDateString()} – {now.toLocaleDateString()}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <div className="p-2 pb-0">
            <p className="text-neutral-11 text-center text-sm">[Calendar placeholder]</p>
          </div>
          <div className="border-neutral-5 mt-4 space-y-2 border-t p-2">
            <div>
              <Label className="text-neutral-10 text-sm font-normal">Start</Label>
              <div className="flex items-center gap-x-2">
                <Input
                  className="h-8 w-[152px] py-0"
                  defaultValue={yesterday.toISOString().slice(0, 10)}
                />
                <Input className="h-8 w-16 py-0" type="time" defaultValue="00:00" />
              </div>
            </div>
            <div>
              <Label className="text-neutral-10 text-sm font-normal">End</Label>
              <div className="flex items-center gap-x-2">
                <Input
                  className="h-8 w-[152px] py-0"
                  defaultValue={now.toISOString().slice(0, 10)}
                />
                <Input className="h-8 w-16 py-0" type="time" defaultValue="23:59" />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              <span className="relative">
                Apply
                <span className="absolute top-[4px] ml-2 text-xs">↵</span>
              </span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 11. schema-contracts / Tag autocomplete (include + exclude)
// ---------------------------------------------------------------------------
const MOCK_TAGS = ['public', 'internal', 'deprecated', 'experimental', 'stable'];

export const SchemaContracts_TagAutocomplete: Story = () => {
  const [includeTags, setIncludeTags] = useState<string[]>(['public']);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  const addIncludeTag = () => {
    if (includeInput && !includeTags.includes(includeInput)) {
      setIncludeTags(prev => [...prev, includeInput]);
      setIncludeInput('');
    }
  };

  const addExcludeTag = () => {
    if (excludeInput && !excludeTags.includes(excludeInput)) {
      setExcludeTags(prev => [...prev, excludeInput]);
      setExcludeInput('');
    }
  };

  return (
    <div className="space-y-6 p-8">
      {/* Include Tags */}
      <div className="flex flex-col gap-4">
        <label className="text-sm font-semibold">Included Tags</label>
        <div className="flex">
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input
                    autoComplete="off"
                    value={includeInput}
                    onChange={e => setIncludeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIncludeTag();
                      }
                    }}
                    placeholder="Add included tag"
                  />
                  <Button onClick={addIncludeTag} disabled={includeInput === ''}>
                    Add
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[200px] p-0"
                onOpenAutoFocus={ev => ev.preventDefault()}
              >
                <Command>
                  <CommandList>
                    <CommandGroup heading="Tags from latest schema version">
                      {MOCK_TAGS.map(value => (
                        <CommandItem
                          key={value}
                          value={value}
                          onSelect={currentValue => {
                            setIncludeTags(prev =>
                              prev.includes(currentValue)
                                ? prev.filter(v => v !== currentValue)
                                : [...prev, currentValue],
                            );
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              includeTags.includes(value) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {value}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 pl-3">
            {includeTags.map(value => (
              <Badge
                key={value}
                className="mr-1 cursor-pointer"
                onClick={() => setIncludeTags(prev => prev.filter(v => v !== value))}
              >
                {value}
                <X size={16} className="pl-1" />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Exclude Tags */}
      <div className="flex flex-col gap-4">
        <label className="text-sm font-semibold">Excluded Tags</label>
        <div className="flex">
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input
                    autoComplete="off"
                    value={excludeInput}
                    onChange={e => setExcludeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExcludeTag();
                      }
                    }}
                    placeholder="Add excluded tag"
                  />
                  <Button onClick={addExcludeTag} disabled={excludeInput === ''}>
                    Add
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[200px] p-0"
                onOpenAutoFocus={ev => ev.preventDefault()}
              >
                <Command>
                  <CommandList>
                    <CommandGroup heading="Tags from latest schema version">
                      {MOCK_TAGS.map(value => (
                        <CommandItem
                          key={value}
                          value={value}
                          onSelect={currentValue => {
                            setExcludeTags(prev =>
                              prev.includes(currentValue)
                                ? prev.filter(v => v !== currentValue)
                                : [...prev, currentValue],
                            );
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              excludeTags.includes(value) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {value}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 pl-3">
            {excludeTags.map(value => (
              <Badge
                key={value}
                className="mr-1 cursor-pointer"
                onClick={() => setExcludeTags(prev => prev.filter(v => v !== value))}
              >
                {value}
                <X size={16} className="pl-1" />
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 12. proposals / Stage Transition Select
// ---------------------------------------------------------------------------
const MOCK_STAGES = [
  { value: 'DRAFT', label: 'REVERT TO DRAFT' },
  { value: 'APPROVED', label: 'APPROVE FOR IMPLEMENTING' },
  { value: 'CLOSED', label: 'CANCEL PROPOSAL' },
];

export const Proposals_StageTransitionSelect: Story = () => {
  const [open, setOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState('READY FOR REVIEW');

  return (
    <div className="p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="link"
            role="combobox"
            className="flex min-w-[200px] max-w-[250px] justify-between truncate"
            aria-expanded={open}
          >
            <span className="truncate">{currentStage}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="truncate p-0">
          <Command>
            <CommandGroup>
              <ScrollArea className="relative max-h-screen">
                {MOCK_STAGES.map(s => (
                  <CommandItem
                    key={s.value}
                    value={s.value}
                    onSelect={() => {
                      setCurrentStage(s.label);
                      setOpen(false);
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div className="hover:text-neutral-12 text-neutral-10 flex flex-row truncate p-1">
                      {s.label}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 13. proposals / Version Select
// ---------------------------------------------------------------------------
const MOCK_VERSIONS = [
  { id: 'v1', cursor: 'c0', commit: 'abc1234', createdAt: '2025-01-15T10:00:00Z', author: 'alice' },
  { id: 'v2', cursor: 'c1', commit: 'def5678', createdAt: '2025-01-14T08:30:00Z', author: 'bob' },
  { id: 'v3', cursor: 'c2', commit: 'ghi9012', createdAt: '2025-01-13T14:15:00Z', author: 'charlie' },
];

export const Proposals_VersionSelect: Story = () => {
  const [open, setOpen] = useState(false);
  const [selectedCursor, setSelectedCursor] = useState<string | undefined>('c0');
  const selectedVersion = MOCK_VERSIONS.find(v => v.cursor === selectedCursor);

  return (
    <div className="p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="link"
            role="combobox"
            className="flex min-w-[50px] max-w-[420px] justify-between"
            aria-expanded={open}
          >
            <span className="truncate">
              {selectedVersion ? selectedVersion.commit : 'Invalid version'}
            </span>
            <ChevronsUpDown className="ml-2 flex size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="min-w-fit max-w-[100vw] truncate p-0">
          <Command>
            <CommandGroup>
              <ScrollArea className="relative max-h-[calc(100vh-300px)] min-h-24 overflow-y-auto">
                {MOCK_VERSIONS.map(version => (
                  <CommandItem
                    key={version.id}
                    value={version.cursor}
                    onSelect={() => {
                      setSelectedCursor(version.cursor);
                      setOpen(false);
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div
                      className={cn(
                        'hover:text-neutral-12 text-neutral-10 flex flex-row gap-x-6 p-1',
                        version.cursor === selectedCursor && 'underline',
                      )}
                    >
                      <div className="max-w-[300px] grow flex-col truncate">{version.commit}</div>
                      <div className="grow flex-col">
                        ({new Date(version.createdAt).toLocaleDateString()})
                      </div>
                      <div className="max-w-[200px] grow flex-col truncate">
                        by {version.author}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 14. proposals / User Filter (multi-select with checkboxes)
// ---------------------------------------------------------------------------
const MOCK_USERS = [
  { id: 'u1', displayName: 'Alice Johnson' },
  { id: 'u2', displayName: 'Bob Smith' },
  { id: 'u3', displayName: 'Charlie Brown' },
  { id: 'u4', displayName: 'Diana Prince' },
  { id: 'u5', displayName: 'Eve Wilson' },
];

export const Proposals_UserFilter: Story = () => {
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const hasSelection = selectedUsers.length !== 0;

  const selectedUserNames = selectedUsers.map(id => {
    const match = MOCK_USERS.find(u => u.id === id);
    return match?.displayName ?? 'Unknown';
  });

  return (
    <div className="p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            className="flex justify-between"
            aria-expanded={open}
          >
            {hasSelection ? selectedUserNames.join(', ') : 'Proposed by'}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Search org members..." />
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="relative max-h-screen">
                {MOCK_USERS.map(user => (
                  <CommandItem
                    key={user.id}
                    value={`${user.id} ${user.displayName}`}
                    onSelect={selectedUser => {
                      const selectedUserId = selectedUser.split(' ')[0];
                      setSelectedUsers(prev => {
                        const idx = prev.findIndex(u => u === selectedUserId);
                        if (idx >= 0) {
                          return prev.filter((_, i) => i !== idx);
                        }
                        return [...prev, selectedUserId];
                      });
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div className="flex w-[270px] min-w-0 flex-row items-center truncate">
                      <Checkbox className="mr-[6px]" checked={selectedUsers.includes(user.id)} />
                      <span className="truncate">{user.displayName}</span>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 15. proposals / Stage Filter (multi-select with checkboxes + "All")
// ---------------------------------------------------------------------------
const MOCK_PROPOSAL_STAGES = ['open', 'draft', 'approved', 'closed', 'implemented'];

export const Proposals_StageFilter: Story = () => {
  const [open, setOpen] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const hasSelection = selectedStages.length !== 0;

  return (
    <div className="p-8">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            className="flex justify-between"
            aria-expanded={open}
          >
            {hasSelection ? selectedStages.join(', ') : 'Stage'}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[180px] truncate p-0">
          <Command>
            <CommandGroup>
              <ScrollArea className="relative max-h-screen">
                <CommandItem
                  key="all"
                  value=""
                  onSelect={() => {
                    const allSelected = MOCK_PROPOSAL_STAGES.every(s =>
                      selectedStages.includes(s),
                    );
                    setSelectedStages(allSelected ? [] : [...MOCK_PROPOSAL_STAGES]);
                  }}
                  className="cursor-pointer truncate border-b"
                >
                  <div className="flex flex-row items-center">
                    <Checkbox
                      className="mr-[6px]"
                      checked={MOCK_PROPOSAL_STAGES.every(s => selectedStages.includes(s))}
                    />
                    <div className="max-w-[350px] grow flex-col truncate">All</div>
                  </div>
                </CommandItem>
                {MOCK_PROPOSAL_STAGES.map(stage => (
                  <CommandItem
                    key={stage}
                    value={stage}
                    onSelect={selectedStage => {
                      setSelectedStages(prev => {
                        const idx = prev.findIndex(s => s === selectedStage);
                        if (idx >= 0) {
                          return prev.filter((_, i) => i !== idx);
                        }
                        return [...prev, selectedStage];
                      });
                    }}
                    className="cursor-pointer truncate"
                  >
                    <div className="flex flex-row items-center">
                      <Checkbox className="mr-[6px]" checked={selectedStages.includes(stage)} />
                      <div className="max-w-[350px] grow flex-col truncate">{stage}</div>
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
