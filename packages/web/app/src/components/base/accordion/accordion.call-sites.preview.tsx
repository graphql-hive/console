import { useState } from 'react';
import { FolderIcon, FolderOpenIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import { Menu } from '@/components/base/floating/menu/menu';
import { Select } from '@/components/base/floating/select/select';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { PermissionTable } from '@/components/organization/permission-table';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  AccordionTriggerPrimitive,
} from '@/components/ui/accordion';
import { PulseIcon } from '@/components/ui/icon';
import { Accordion as V2Accordion } from '@/components/v2/accordion';
import {
  CheckIcon,
  DotsHorizontalIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@radix-ui/react-icons';

export const nav: NavPath = 'Base/Primitives/Accordion/Component Examples';

/**
 * Every accordion in the app as it ships today, on `ui/accordion` (Radix, shadcn parts) and
 * `v2/accordion` (Radix, compound `Accordion.Item/Header/Content`). Nine mounts in eight files.
 * The pages around them run queries and mutations, so the content inside each item is stood in
 * where it would need one: the schema highlighter is a `<pre>`, the change details a paragraph,
 * the approval badge a Badge.
 *
 * Read with `base/accordion`, which exists (Base UI) and is on one call site, the alert rule
 * form's Advanced settings. What these sites use that it does not offer is the round's API work.
 */

const ENTRIES = [
  {
    source: 'components/organization/members/permission-selector.tsx:98',
    origin: 'ui',
    what: 'Permission groups on the role form: multiple open, controlled, every panel kept mounted, "N selected" at the trigger end',
    coveredBy: 'Permission selector',
  },
  {
    source: 'components/organization/members/selected-permission-overview.tsx:151',
    origin: 'ui',
    what: 'A role\'s granted permissions: one item, open by default when anything is granted, "N allowed" at the trigger end',
    coveredBy: 'Permission overview',
  },
  {
    source: 'components/organization/settings/access-tokens/permission-detail-view.tsx:45',
    origin: 'ui',
    what: "An access token's permissions per level, the same shape plus the resources it was granted on",
    coveredBy: 'Permission overview',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:233',
    origin: 'ui',
    what: 'One accordion per schema change on the check, version and proposal pages: a rich trigger, details below',
    coveredBy: 'Schema changes',
  },
  {
    source: 'components/target/proposals/change-detail.tsx:22',
    origin: 'v2',
    what: 'A proposal change: v2 root around ui parts, message and an icon in the trigger',
    coveredBy: 'Proposal change',
  },
  {
    source: 'components/target/settings/registry-access-token.tsx:231',
    origin: 'v2',
    what: "The registry token form's permission section, open by default",
    coveredBy: 'Registry token',
  },
  {
    source: 'pages/target.tsx:74',
    origin: 'v2',
    what: 'The services of a federation target, each a boxed item with a two-line header and the SDL inside',
    coveredBy: 'Target services',
  },
  {
    source: 'pages/target.tsx:94',
    origin: 'v2',
    what: 'A single service: the same item, always open, trigger disabled',
    coveredBy: 'Target services',
  },
  {
    source: 'lib/hooks/laboratory/use-operation-collections-plugin.tsx:302',
    origin: 'ui',
    what: 'Laboratory collections: multiple open, controlled, a raw trigger with folder icons and a menu beside it, e2e hooks',
    coveredBy: 'Laboratory collections',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/accordion + v2/accordion"
      summary={
        <>
          Nine mounts. Six on ui/accordion, which is Radix with a chevron trigger and a bordered
          item; three on v2/accordion, which is Radix with a boxed header and its own chevron, and
          always collapsible. One site mixes the two. Base already has an Accordion on Base UI with
          numeric values and a text-only trigger, used once.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// components/organization/members/permission-selector.tsx:98
// ---------------------------------------------------------------------------

const PERMISSION_GROUPS = [
  {
    title: 'Organization',
    permissions: [
      {
        id: 'organization:describe',
        title: 'Describe organization',
        description: 'Fetch information about the organization.',
      },
      {
        id: 'member:modify',
        title: 'Modify members',
        description: 'Invite, remove and assign roles.',
      },
    ],
  },
  {
    title: 'Project',
    permissions: [
      {
        id: 'project:describe',
        title: 'Describe project',
        description: 'Fetch information about projects.',
      },
      { id: 'project:delete', title: 'Delete project', description: 'Delete projects.' },
    ],
  },
  {
    title: 'Schema Registry',
    permissions: [
      { id: 'schemaCheck:create', title: 'Check schema', description: 'Run schema checks.' },
      {
        id: 'schemaVersion:publish',
        title: 'Publish schema',
        description: 'Publish schema versions.',
      },
      {
        id: 'schemaCheck:approve',
        title: 'Approve failed check',
        description: 'Approve failed schema checks.',
      },
    ],
  },
];

function PermissionSelector() {
  const [openAccordions, setOpenAccordions] = useState([] as Array<string>);
  const [selected, setSelected] = useState(new Set(['organization:describe', 'project:describe']));
  return (
    <Accordion
      type="multiple"
      className="w-full"
      value={openAccordions}
      onValueChange={values => setOpenAccordions(values)}
    >
      {PERMISSION_GROUPS.map(group => {
        const count = group.permissions.filter(p => selected.has(p.id)).length;
        return (
          <AccordionItem value={group.title} key={group.title}>
            <AccordionTrigger
              className="w-full"
              aria-label={`${group.title} permission group with ${count} permissions selected`}
            >
              {group.title}{' '}
              <span className="ml-auto mr-0">
                {count > 0 && <span className="mr-1 inline-block text-sm">{count} selected</span>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pl-2 pt-1" forceMount>
              {group.permissions.map(permission => (
                <div
                  key={permission.id}
                  className="flex flex-row items-center justify-between space-x-4 py-2"
                >
                  <div>
                    <div className="text-neutral-12 font-semibold">{permission.title}</div>
                    <div className="text-neutral-10 text-xs">{permission.description}</div>
                  </div>
                  <Select
                    aria-label={permission.title}
                    options={[
                      { value: 'not-selected', label: 'Not Selected' },
                      { value: 'allow', label: 'Allow' },
                    ]}
                    value={selected.has(permission.id) ? 'allow' : 'not-selected'}
                    onValueChange={value => {
                      const next = new Set(selected);
                      if (value === 'allow') next.add(permission.id);
                      else next.delete(permission.id);
                      setSelected(next);
                    }}
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export const PermissionSelectorPreview = createPreview({
  label: 'Permission selector',
  render: () => (
    <CallSite
      source="components/organization/members/permission-selector.tsx:98"
      origin="ui"
      note="Multiple groups open at once, the open set held by the form. Every panel is force-mounted, so a closed group's selects stay in the DOM. The count sits at the far end of the trigger, before the chevron."
    >
      <div className="w-[36rem]">
        <PermissionSelector />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/members/selected-permission-overview.tsx:151
// components/organization/settings/access-tokens/permission-detail-view.tsx:45
// ---------------------------------------------------------------------------

const GRANTED_ROWS = [
  { id: 'schemaCheck:create', title: 'Check schema', granted: true },
  { id: 'schemaVersion:publish', title: 'Publish schema', granted: true },
  { id: 'schemaCheck:approve', title: 'Approve failed check', granted: false },
];

function PermissionOverview(props: { withResources?: boolean }) {
  const allowed = GRANTED_ROWS.filter(row => row.granted).length;
  return (
    <Accordion type="single" defaultValue={allowed > 0 ? 'Target' : undefined} collapsible>
      <AccordionItem value="Target">
        <AccordionTrigger className="w-full">
          Target
          <span className="ml-auto mr-2">{allowed} allowed</span>
        </AccordionTrigger>
        <AccordionContent className="ml-1 flex max-w-[800px] flex-wrap items-start overflow-x-auto">
          <div className="w-[50%] min-w-[400px] pb-4 pr-12">
            <PermissionTable title="Schema Registry" permissions={GRANTED_ROWS} />
          </div>
          <div className="w-[50%] min-w-[400px] pb-4 pr-12">
            <PermissionTable
              title="Laboratory"
              permissions={[
                { id: 'laboratory:describe', title: 'Describe laboratory', granted: true },
              ]}
            />
          </div>
          {props.withResources ? (
            <div className="w-full space-y-1">
              <p className="text-neutral-10">Granted on targets:</p>
              <ul className="flex list-none flex-wrap gap-1">
                {['the-guild/hive/production', 'the-guild/hive/staging'].map(id => (
                  <li key={id}>
                    <Badge content={id} variants={{ variant: 'outline', mono: true }} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export const PermissionOverviewPreview = createPreview({
  label: 'Permission overview',
  render: () => (
    <div className="flex flex-col gap-10">
      <CallSite
        source="components/organization/members/selected-permission-overview.tsx:151"
        origin="ui"
        note="One item per permission level, open by default when the role grants anything at that level. The tables wrap in two columns inside the panel."
      >
        <div className="w-[52rem]">
          <PermissionOverview />
        </div>
      </CallSite>
      <CallSite
        source="components/organization/settings/access-tokens/permission-detail-view.tsx:45"
        origin="ui"
        note="The access token sheet's copy of the same shape, through a namespace import, with the resources the level was granted on listed under the tables."
      >
        <div className="w-[52rem]">
          <PermissionOverview withResources />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/target/history/errors-and-changes.tsx:233
// ---------------------------------------------------------------------------

const CHANGES = [
  {
    message: "Field 'Query.invoices' was removed",
    severity: 'text-critical',
    usage: { operations: 12, clients: 3 },
    reason:
      'Removing a field is a breaking change. It is preferable to deprecate the field before removing it.',
  },
  {
    message: "Field 'User.avatarUrl' was added to object type 'User'",
    severity: 'text-emerald-400',
    reason: 'No details available for this change.',
  },
  {
    message: "Field 'Product.price' changed type from 'Int!' to 'Float!'",
    severity: 'text-accent',
    approved: true,
    reason: 'Changing the type of a field may break existing queries.',
  },
];

function ChangeRow(props: { change: (typeof CHANGES)[number] }) {
  const { change } = props;
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className={`text-left ${change.severity}`}>
              <div>
                <span className="text-neutral-10">{change.message}</span>
                {change.usage ? (
                  <>
                    {' '}
                    <span className="bg-neutral-5 text-critical inline-flex items-center space-x-1 rounded-sm px-2 py-1 align-middle font-bold">
                      <PulseIcon className="h-4 stroke-[1px]" />
                      <span className="text-xs">
                        {change.usage.operations} operations by {change.usage.clients} clients
                        affected
                      </span>
                    </span>
                  </>
                ) : null}
                {change.approved ? (
                  <>
                    {' '}
                    <Badge
                      content="Approved by Ada Lovelace"
                      variants={{ variant: 'secondary', size: 'sm' }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">{change.reason}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export const SchemaChangesPreview = createPreview({
  label: 'Schema changes',
  render: () => (
    <CallSite
      source="components/target/history/errors-and-changes.tsx:233"
      origin="ui"
      note="Every change on the check, version and proposal pages is its own single-item accordion, so the rows stack into a list. The trigger carries the message colored by severity, the usage pill and the approval badge; the panel the reason, the affected operations and the approval form. The ui trigger's hover underline is switched off here."
    >
      <div className="w-[48rem]">
        {CHANGES.map(change => (
          <ChangeRow key={change.message} change={change} />
        ))}
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/target/proposals/change-detail.tsx:22
// ---------------------------------------------------------------------------

export const ProposalChangePreview = createPreview({
  label: 'Proposal change',
  render: () => (
    <CallSite
      source="components/target/proposals/change-detail.tsx:22"
      origin="v2"
      note="The v2 root around ui parts, which works because both are Radix underneath. The v2 root is always collapsible and stamps data-cy=accordion; the trigger text is dimmed and an icon sits after the message."
    >
      <div className="w-[48rem]">
        <V2Accordion type="single">
          <AccordionItem value="item-1">
            <AccordionHeader className="flex">
              <AccordionTrigger className="text-neutral-8 py-3 hover:no-underline">
                <div className="flex w-full flex-row items-center text-left">
                  <div>Field 'Query.invoices' was removed</div>
                  <div className="min-w-fit grow pr-2 md:flex-none">
                    <ExclamationTriangleIcon className="text-critical ml-2 inline size-4" />
                  </div>
                </div>
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>No details available for this change.</AccordionContent>
          </AccordionItem>
        </V2Accordion>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/target/settings/registry-access-token.tsx:231
// ---------------------------------------------------------------------------

export const RegistryTokenPreview = createPreview({
  label: 'Registry token',
  render: () => (
    <CallSite
      source="components/target/settings/registry-access-token.tsx:231"
      origin="v2"
      note="Inside the create token dialog: one item, open by default, holding the registry scope row. The v2 header pads and rounds itself; the content pads too."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[32rem] rounded-md border p-4">
        <V2Accordion defaultValue="Permissions">
          <V2Accordion.Item value="Permissions">
            <V2Accordion.Header>Registry &amp; Usage</V2Accordion.Header>
            <V2Accordion.Content>
              <div
                className="flex flex-row items-center justify-between space-x-4 py-2"
                data-cy="registry-access-scope"
              >
                <div>
                  <div className="text-neutral-12 font-semibold">Registry &amp; Usage</div>
                  <div className="text-neutral-10 text-xs">
                    Manage access to schema registry and usage reporting.
                  </div>
                </div>
                <Select
                  aria-label="Registry & Usage access"
                  options={[
                    { value: 'no-access', label: 'No access' },
                    { value: 'read', label: 'Read-only' },
                    { value: 'write', label: 'Read & write' },
                  ]}
                  value="write"
                  onSurface="raised"
                />
              </div>
            </V2Accordion.Content>
          </V2Accordion.Item>
        </V2Accordion>
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target.tsx:74 and :94
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    id: 's1',
    service: 'users',
    url: 'https://users.storefront.local/graphql',
    source:
      'type Query {\n  me: User\n  user(id: ID!): User\n}\n\ntype User @key(fields: "id") {\n  id: ID!\n  fullName: String!\n}',
  },
  {
    id: 's2',
    service: 'products',
    url: 'https://products.storefront.local/graphql',
    source:
      'type Query {\n  products(first: Int = 20): [Product!]!\n}\n\ntype Product @key(fields: "id") {\n  id: ID!\n  name: String!\n}',
  },
];

function SchemaBlock({ schema }: { schema: (typeof SERVICES)[number] }) {
  return (
    <V2Accordion.Item value={schema.id} className="border-neutral-5/50 border-2">
      <V2Accordion.Header>
        <div>
          <div className="text-base">{schema.service}</div>
          <div className="text-neutral-10 text-xs">{schema.url}</div>
        </div>
      </V2Accordion.Header>
      <V2Accordion.Content>
        <div className="p-2">
          {/* GraphQLHighlight is a Monaco editor; a code block stands in for it. */}
          <pre className="text-neutral-11 font-mono text-xs leading-relaxed">{schema.source}</pre>
        </div>
      </V2Accordion.Content>
    </V2Accordion.Item>
  );
}

export const TargetServicesPreview = createPreview({
  label: 'Target services',
  render: () => (
    <div className="flex flex-col gap-10">
      <CallSite
        source="pages/target.tsx:74"
        origin="v2"
        note="Each service is a boxed item with a thick border, a two-line header (service name, URL) and the SDL inside. Single open, spaced by the root's className."
      >
        <div className="w-[48rem]">
          <V2Accordion className="space-y-4" type="single">
            {SERVICES.map(schema => (
              <SchemaBlock key={schema.id} schema={schema} />
            ))}
          </V2Accordion>
        </div>
      </CallSite>
      <CallSite
        source="pages/target.tsx:94"
        origin="v2"
        note="With one service the same item is forced open and the trigger disabled, so the chevron is decoration. An accordion standing in for a card with a header."
      >
        <div className="w-[48rem]">
          <V2Accordion type="single" disabled value={SERVICES[0].id}>
            <SchemaBlock schema={SERVICES[0]} />
          </V2Accordion>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// lib/hooks/laboratory/use-operation-collections-plugin.tsx:302
// ---------------------------------------------------------------------------

const COLLECTIONS = [
  {
    id: 'c1',
    name: 'Onboarding',
    operations: ['GetViewer', 'ListProjects', 'CreateTarget'],
  },
  { id: 'c2', name: 'Regression', operations: ['PublishSchema'] },
  { id: 'c3', name: 'Scratch', operations: [] },
];

function Collections() {
  const [value, setValue] = useState<string[]>(['c1']);
  return (
    <Accordion value={value} onValueChange={setValue} type="multiple">
      {COLLECTIONS.map(collection => (
        <AccordionItem key={collection.id} value={collection.id} className="border-b-0">
          <AccordionHeader className="flex items-center justify-between" data-cy="collection-item">
            <AccordionTriggerPrimitive
              className="text-neutral-12 hover:bg-neutral-11/10 group flex w-full items-center gap-x-3 rounded-sm p-2 text-left font-medium"
              data-cy="collection-item-trigger"
            >
              <FolderIcon className="size-4 group-data-[state=open]:hidden" />
              <FolderOpenIcon className="size-4 group-data-[state=closed]:hidden" />
              {collection.name}
            </AccordionTriggerPrimitive>
            <Menu
              align="end"
              trigger={
                <button
                  type="button"
                  aria-label="More"
                  className="hover:bg-neutral-11/10 rounded-sm p-1"
                  data-cy="collection-menu-trigger"
                >
                  <DotsHorizontalIcon />
                </button>
              }
              sections={[
                [{ label: 'Add operation', trailingIcon: PlusIcon, onClick: () => {} }],
                [
                  { label: 'Edit', onClick: () => {} },
                  { label: 'Delete', variant: 'destructiveAction', onClick: () => {} },
                ],
              ]}
            />
          </AccordionHeader>
          <AccordionContent className="space-y-0 pb-2 pl-2">
            {collection.operations.length ? (
              collection.operations.map(name => (
                <div key={name} className="flex items-center">
                  <a
                    href="#"
                    className="hover:bg-neutral-11/10 text-neutral-11 hover:text-neutral-12 flex w-full items-center gap-x-3 rounded-sm p-2 text-sm"
                  >
                    <CheckIcon className="size-4 opacity-0" />
                    {name}
                  </a>
                </div>
              ))
            ) : (
              <button type="button" className="text-neutral-10 mx-auto block p-2 text-sm">
                <PlusIcon className="mr-1 inline size-4" /> Add Operation
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export const LaboratoryCollectionsPreview = createPreview({
  label: 'Laboratory collections',
  render: () => (
    <CallSite
      source="lib/hooks/laboratory/use-operation-collections-plugin.tsx:302"
      origin="ui"
      note="The laboratory sidebar. The trigger is the raw Radix trigger with its own styling: folder icons that swap on open, no chevron. The menu button is a sibling of the trigger inside the header, not a child, since a button cannot nest in a button. Multiple open, controlled so a collection can be opened from the URL, and the root takes a ref for scrolling. Three e2e hooks: collection-item, collection-item-trigger, collection-menu-trigger."
    >
      <div className="w-72">
        <Collections />
      </div>
    </CallSite>
  ),
});
