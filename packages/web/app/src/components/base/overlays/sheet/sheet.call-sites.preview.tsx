import { useState } from 'react';
import {
  ArrowUp,
  Circle,
  CircleCheck,
  Clock,
  Link as LinkLucide,
  PieChart,
  Play,
  TreePine,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite } from '@/components/inventory/shared';
import { Button } from '@/components/ui/button';
import { CopyIconButton } from '@/components/ui/copy-icon-button';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '../../badge/badge';
import { Select } from '../../floating/select/select';
import { Input } from '../../input/input';
import { RadioGroup } from '../../radio-group/radio-group';
import { ScrollArea } from '../../scroll-area/scroll-area';
import { Textarea } from '../../textarea/textarea';
import { Sheet } from './sheet';

export const nav: NavPath = 'Base/Overlays/Sheet/Component Examples';

/**
 * Every sheet shape in the app on base Sheet, one preview per shape with the call sites it stands
 * for. The pages mount queries and mutations, so the data is mocked and a submit only closes.
 */

// ---------------------------------------------------------------------------
// A picker with its actions in the footer
// ---------------------------------------------------------------------------

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to the organization' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export const Picker = createPreview({
  label: 'Picker',
  render: () => <RoleMappingPickerExample />,
});

function RoleMappingPickerExample() {
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState('');
  return (
    <CallSite
      source="organization/settings/shared/role-mapping-picker-sheet.tsx:55, opened from groups/manage-group-mapping-sheet.tsx:115 and members/member-role-picker.tsx"
      origin="base"
      note="Width lg. The title takes a node, here with a Badge in it, and the caller passes its actions into the footer. The resource selector and the permission overview under the role are stood in by their headings: both read fragments the page fetches."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open group-mapping sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        width="lg"
        title={
          <>
            Add new group role mapping to <Badge content="platform" />
          </>
        }
        description="Assign a role with permissions to the group role."
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="ghost">
              Abort
            </Button>
            <Button disabled={!roleId} onClick={() => setOpen(false)}>
              Create Role Assignment
            </Button>
          </>
        }
      >
        <div className="pt-2">
          <Heading size="lg" className="mb-1 text-sm">
            Assigned Member Role
          </Heading>
          <Select
            options={ROLES}
            value={roleId}
            onValueChange={setRoleId}
            placeholder="Select a role"
            width="full"
            onSurface="raised"
          />
          <p className="text-neutral-10 mt-2 text-sm">
            The role assigned to the user that will grant permissions.
          </p>
        </div>
        <div className="pt-10">
          <Heading size="lg" className="mb-1 text-sm">
            Assigned Resources
          </Heading>
          <p className="text-neutral-10 mt-2 text-sm">
            Specify the resources on which the permissions will be granted.
          </p>
        </div>
      </Sheet>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// A form whose submit lives in the footer
// ---------------------------------------------------------------------------

const PRIORITY_ITEMS = [
  {
    value: 'NORMAL',
    label: 'Normal',
    description:
      'Minor problems or general questions with little to no impact on functionality, often involving small nuisances or easily bypassed errors.',
  },
  {
    value: 'HIGH',
    label: 'High',
    description:
      'Problems that significantly hinder functionality, resulting in severe performance degradation while the platform remains operational.',
  },
  {
    value: 'URGENT',
    label: 'Urgent',
    description:
      'Problems that halt essential functionality, preventing critical business operations with no workarounds available.',
  },
];

export const FormInBody = createPreview({
  label: 'Form in the body',
  render: () => <NewTicketExample />,
});

function NewTicketExample() {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState('NORMAL');
  return (
    <CallSite
      source="pages/organization-support.tsx:134 (stands for the three access token sheets, the alert form sheet, the SSO provider sheet and the registered domain sheet)"
      origin="base"
      note="The body scrolls on its own, so the form needs no scroll layout. Submit sits in the footer, bound to the form by id. Every control is raised, the RadioGroup included."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open new-ticket sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="New ticket"
        description="Create a new case for the support team"
        footer={
          <Button type="submit" form="new-ticket-form">
            Submit
          </Button>
        }
      >
        <form
          id="new-ticket-form"
          className="space-y-6 text-sm"
          onSubmit={event => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <div className="space-y-3">
            <Label>Priority level</Label>
            <RadioGroup
              variant="as-card"
              onSurface="raised"
              orientation="vertical"
              value={priority}
              onValueChange={setPriority}
              items={PRIORITY_ITEMS}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input placeholder="Enter a subject of your issue" onSurface="raised" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Enter a short description of your issue" onSurface="raised" />
            <p className="text-neutral-10 text-xs">Help us understand it better.</p>
          </div>
        </form>
      </Sheet>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// A checklist of links
// ---------------------------------------------------------------------------

const TASKS = [
  { title: 'Create a project', description: 'A project represents a GraphQL API', done: true },
  {
    title: 'Publish a schema',
    description: 'Publish your first schema to the registry',
    done: true,
  },
  {
    title: 'Check a schema',
    description: 'Run a schema check to validate your changes',
    done: false,
  },
  {
    title: 'Invite members',
    description: 'Invite your team members to collaborate on your projects',
    done: false,
  },
  {
    title: 'Report operations',
    description: 'Collect and analyze your GraphQL API usage',
    done: false,
  },
  {
    title: 'Enable usage-based schema checking',
    description: 'Detect breaking changes based on real usage data',
    done: false,
  },
];

export const Checklist = createPreview({
  label: 'Checklist',
  render: () => <GetStartedExample />,
});

function GetStartedExample() {
  const [open, setOpen] = useState(false);
  return (
    <CallSite
      source="get-started/wizard.tsx:24"
      origin="base"
      note="No footer. The task cards sit at neutral-4 so they read as raised on the sheet."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open get-started sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Get Started"
        description="Follow the steps to set up your organization and experience the full power of GraphQL Hive"
      >
        <div className="space-y-3">
          {TASKS.map(task => (
            <a
              key={task.title}
              href="#"
              className={cn(
                'border-neutral-5 hover:bg-neutral-5 bg-neutral-4 relative block rounded-lg border p-4',
                task.done ? 'opacity-70' : null,
              )}
            >
              <div className="flex items-start space-x-3">
                {task.done ? (
                  <CircleCheck className="text-accent size-5" />
                ) : (
                  <Circle className="text-accent size-5" />
                )}
                <div className="w-0 flex-1">
                  <p className="text-neutral-12 font-medium leading-5">{task.title}</p>
                  <p className="text-neutral-10 mt-1 text-sm">{task.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </Sheet>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Half width, edge to edge, scrolling on its own
// ---------------------------------------------------------------------------

const SPAN_ATTRIBUTES = [
  { key: 'http.method', value: 'POST' },
  { key: 'http.route', value: '/graphql' },
  { key: 'graphql.operation.name', value: 'GetUser' },
  { key: 'graphql.operation.type', value: 'query' },
  { key: 'db.system', value: 'postgres' },
  { key: 'db.statement', value: 'SELECT id, email FROM users WHERE id = $1' },
  { key: 'net.peer.name', value: 'db.internal' },
  { key: 'net.peer.port', value: '5432' },
];

const TABS = [
  { id: 'span-attributes', label: 'Span Attributes', count: SPAN_ATTRIBUTES.length },
  { id: 'resource-attributes', label: 'Resource Attributes', count: 3 },
  { id: 'events', label: 'Events', count: 0 },
];

export const EdgeToEdge = createPreview({
  label: 'Edge to edge',
  render: () => <SpanDetailsExample />,
});

function SpanDetailsExample() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('span-attributes');
  return (
    <CallSite
      source="pages/target-trace.tsx:1436 (stands for the selected trace sheet on pages/target-traces.tsx, whose body is the resizable waterfall)"
      origin="base"
      note="Width half, padding none: the body owns its layout and scrolling. The metrics row and the tab strip stay put, the rows scroll in their own ScrollArea, and the footer keeps the ghost actions. The real rows expand and the tabs switch content; here they are static."
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open span-details sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        width="half"
        padding="none"
        title={
          <>
            Span Details
            <span className="text-neutral-10 ml-2 font-mono font-normal">a3f9</span>
            <span className="text-neutral-10 ml-2">query GetUser</span>
          </>
        }
        description={
          <>
            Span ID: <span className="font-mono">a3f9c2d1e8b74f60</span>
            <CopyIconButton value="a3f9c2d1e8b74f60" label="Copy Span ID" />
          </>
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <ArrowUp className="mr-2 size-4" /> Show Parent Span
            </Button>
            <Button variant="ghost" size="sm">
              <LinkLucide className="mr-2 size-4" /> Share Link
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 px-6 pb-4 md:grid-cols-4">
          <div className="flex items-center space-x-2">
            <Clock className="size-4 text-blue-500" />
            <div>
              <p className="text-neutral-10 text-xs">Duration</p>
              <p className="text-sm font-medium">42.1ms</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Play className="size-4 text-green-500" />
            <div>
              <p className="text-neutral-10 text-xs">Start</p>
              <p className="text-sm font-medium">3.8ms</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <PieChart className="size-4 text-purple-500" />
            <div>
              <p className="text-neutral-10 text-xs">% of Total</p>
              <p className="text-sm font-medium">61%</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TreePine className="text-accent size-4" />
            <div>
              <p className="text-neutral-10 text-xs">% of Parent</p>
              <p className="text-sm font-medium">88%</p>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-neutral-5 border-y">
            <div className="flex w-full gap-x-4 px-4 text-xs font-medium">
              {TABS.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    'border-b-2 p-2',
                    tab === entry.id
                      ? 'border-[#2662d8]'
                      : 'hover:border-neutral-5 border-transparent',
                  )}
                  onClick={() => setTab(entry.id)}
                >
                  <div className="flex items-center gap-x-2">
                    <div>{entry.label}</div>
                    <Badge
                      content={String(entry.count)}
                      variants={{ variant: 'secondary', size: 'sm' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <ScrollArea fill>
            {SPAN_ATTRIBUTES.map(attribute => (
              <div
                key={attribute.key}
                className="border-neutral-5 flex items-center justify-between border-b p-3 text-xs last:border-0"
              >
                <div className="text-neutral-10 flex flex-1 pr-2">{attribute.key}</div>
                <div className="text-neutral-12 flex-1 truncate font-mono">{attribute.value}</div>
                <span className="text-neutral-12 ml-auto mr-0 flex">
                  <CopyIconButton value={attribute.value} label="Copy attribute value" />
                </span>
              </div>
            ))}
          </ScrollArea>
        </div>
      </Sheet>
    </CallSite>
  );
}
