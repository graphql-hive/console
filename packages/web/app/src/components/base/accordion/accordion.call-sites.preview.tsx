import { useState } from 'react';
import { FolderIcon, FolderOpenIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Badge } from '@/components/base/badge/badge';
import { Card } from '@/components/base/card/card';
import { Menu } from '@/components/base/floating/menu/menu';
import { Select } from '@/components/base/floating/select/select';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { PermissionTable } from '@/components/organization/permission-table';
import { PulseIcon } from '@/components/ui/icon';
import {
  CheckIcon,
  DotsHorizontalIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import { Accordion } from './accordion';

export const nav: NavPath = 'Base/Primitives/Accordion/Component Examples';

/**
 * Every accordion in the app, transcribed as it ships on base Accordion. Nine mounts in eight
 * files. The pages around them run queries and mutations, so the content inside each item is stood
 * in where it would need one: the schema highlighter is a `<pre>`, the change details a paragraph,
 * the approval badge a Badge.
 *
 * History: until round 7 six of these were on `ui/accordion` (Radix, shadcn parts) and three on
 * `v2/accordion` (Radix, compound parts, always collapsible), one site mixing the two. A single
 * service on the target page was an accordion locked open with its trigger disabled; it is a Card
 * now. Both old components and `@radix-ui/react-accordion` are deleted.
 */

const ENTRIES = [
  {
    source: 'components/organization/members/permission-selector.tsx:93',
    origin: 'base',
    what: 'Permission groups on the role form: multiple open, controlled, panels kept mounted for the dependency jump, "N selected" trailing',
    coveredBy: 'Permission selector',
  },
  {
    source: 'components/organization/members/selected-permission-overview.tsx:146',
    origin: 'base',
    what: 'A role\'s granted permissions: one item, open by default when anything is granted, "N allowed" trailing',
    coveredBy: 'Permission overview',
  },
  {
    source: 'components/organization/settings/access-tokens/permission-detail-view.tsx:45',
    origin: 'base',
    what: "An access token's permissions per level, the same shape plus the resources it was granted on",
    coveredBy: 'Permission overview',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:227',
    origin: 'base',
    what: 'One accordion per schema change on the check, version and proposal pages: a rich label, details below',
    coveredBy: 'Schema changes',
  },
  {
    source: 'components/target/proposals/change-detail.tsx:20',
    origin: 'base',
    what: 'A proposal change: dimmed message and an icon in the label',
    coveredBy: 'Proposal change',
  },
  {
    source: 'components/target/settings/registry-access-token.tsx:231',
    origin: 'base',
    what: "The registry token form's permission section, plain and open by default",
    coveredBy: 'Registry token',
  },
  {
    source: 'pages/target.tsx:67',
    origin: 'base',
    what: 'The services of a federation target, boxed, a two-line header and the SDL inside',
    coveredBy: 'Target services',
  },
  {
    source: 'pages/target.tsx:86',
    origin: 'base',
    what: 'A single service: a Card with the same header and SDL, since there is nothing to collapse',
    coveredBy: 'Target services',
  },
  {
    source: 'lib/hooks/laboratory/use-operation-collections-plugin.tsx:301',
    origin: 'base',
    what: 'Laboratory collections: plain, no chevron, folder icons in the label, a menu through action, e2e hooks on item and trigger',
    coveredBy: 'Laboratory collections',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/accordion"
      summary={
        <>
          Nine mounts, all on base Accordion. Three of the four variants ship: list on the
          permission views and the change rows, boxed on the target services, plain on the alert
          form's disclosure, the registry token section and the collections sidebar.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// components/organization/members/permission-selector.tsx:93
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
      multiple
      keepMounted
      value={openAccordions}
      onValueChange={setOpenAccordions}
      items={PERMISSION_GROUPS.map(group => {
        const count = group.permissions.filter(p => selected.has(p.id)).length;
        return {
          value: group.title,
          label: group.title,
          trailing: count > 0 ? <span>{count} selected</span> : undefined,
          content: (
            <div className="pl-2 pt-1">
              {group.permissions.map(permission => (
                <div
                  key={permission.id}
                  className="flex flex-row items-center justify-between space-x-4 pb-2 pr-2 text-sm"
                >
                  <div>
                    <div className="text-neutral-12 font-semibold">{permission.title}</div>
                    <div className="text-neutral-11 text-xs">{permission.description}</div>
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
            </div>
          ),
        };
      })}
    />
  );
}

export const PermissionSelectorPreview = createPreview({
  label: 'Permission selector',
  render: () => (
    <CallSite
      source="components/organization/members/permission-selector.tsx:93"
      origin="base"
      note="Multiple groups open at once, the open set held by the form. Closed panels stay mounted: the View permission link finds a dependency's row by ref before opening its group. The count sits in the trailing slot, before the chevron."
    >
      <div className="w-[36rem]">
        <PermissionSelector />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/members/selected-permission-overview.tsx:146
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
    <Accordion
      defaultValue={allowed > 0 ? ['Target'] : undefined}
      items={[
        {
          value: 'Target',
          label: 'Target',
          trailing: <span>{allowed} allowed</span>,
          content: (
            <div className="ml-1 flex max-w-[800px] flex-wrap items-start overflow-x-auto">
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
            </div>
          ),
        },
      ]}
    />
  );
}

export const PermissionOverviewPreview = createPreview({
  label: 'Permission overview',
  render: () => (
    <div className="flex flex-col gap-10">
      <CallSite
        source="components/organization/members/selected-permission-overview.tsx:146"
        origin="base"
        note="One item per permission level, open by default when the role grants anything at that level. The tables wrap in two columns inside the panel."
      >
        <div className="w-[52rem]">
          <PermissionOverview />
        </div>
      </CallSite>
      <CallSite
        source="components/organization/settings/access-tokens/permission-detail-view.tsx:45"
        origin="base"
        note="The access token sheet's copy of the same shape, with the resources the level was granted on listed under the tables."
      >
        <div className="w-[52rem]">
          <PermissionOverview withResources />
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// components/target/history/errors-and-changes.tsx:227
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
    <Accordion
      items={[
        {
          value: 'item-1',
          label: (
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
          ),
          content: <div className="pb-4 pt-4">{change.reason}</div>,
        },
      ]}
    />
  );
}

export const SchemaChangesPreview = createPreview({
  label: 'Schema changes',
  render: () => (
    <CallSite
      source="components/target/history/errors-and-changes.tsx:227"
      origin="base"
      note="Every change on the check, version and proposal pages is its own single-item accordion, so the rows stack into a list with a hairline under each. The label carries the message colored by severity, the usage pill and the approval badge; the panel the reason, the affected operations and the approval form."
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
// components/target/proposals/change-detail.tsx:20
// ---------------------------------------------------------------------------

export const ProposalChangePreview = createPreview({
  label: 'Proposal change',
  render: () => (
    <CallSite
      source="components/target/proposals/change-detail.tsx:20"
      origin="base"
      note="The message is dimmed and an icon sits after it; the panel holds the error, or a line saying there is none."
    >
      <div className="w-[48rem]">
        <Accordion
          items={[
            {
              value: 'item-1',
              label: (
                <div className="text-neutral-8 flex w-full flex-row items-center">
                  <div>Field 'Query.invoices' was removed</div>
                  <div className="min-w-fit grow pr-2 md:flex-none">
                    <ExclamationTriangleIcon className="text-critical ml-2 inline size-4" />
                  </div>
                </div>
              ),
              content: 'No details available for this change.',
            },
          ]}
        />
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
      origin="base"
      note="Inside the create token dialog: one item, plain and open by default, holding the registry scope row."
    >
      <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-5 w-[32rem] rounded-md border p-4">
        <Accordion
          variant="plain"
          defaultValue={['Permissions']}
          items={[
            {
              value: 'Permissions',
              label: 'Registry & Usage',
              content: (
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
              ),
            },
          ]}
        />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target.tsx:67 and :86
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

function serviceHeader(schema: (typeof SERVICES)[number]) {
  return (
    <div>
      <div className="text-base">{schema.service}</div>
      <div className="text-neutral-10 text-xs font-normal">{schema.url}</div>
    </div>
  );
}

/** GraphQLHighlight is a Monaco editor; a code block stands in for it. */
function serviceSchema(schema: (typeof SERVICES)[number]) {
  return (
    <div className="p-2">
      <pre className="text-neutral-11 font-mono text-xs leading-relaxed">{schema.source}</pre>
    </div>
  );
}

export const TargetServicesPreview = createPreview({
  label: 'Target services',
  render: () => (
    <div className="flex flex-col gap-10">
      <CallSite
        source="pages/target.tsx:67"
        origin="base"
        note="Each service is a boxed item with a two-line header (service name, URL) and the SDL inside. Single open, spaced by the variant."
      >
        <div className="w-[48rem]">
          <Accordion
            variant="boxed"
            items={SERVICES.map(schema => ({
              value: schema.id,
              label: serviceHeader(schema),
              content: serviceSchema(schema),
            }))}
          />
        </div>
      </CallSite>
      <CallSite
        source="pages/target.tsx:86"
        origin="base"
        note="With one service there is nothing to collapse, so it is a Card with the same header and SDL. Until round 7 this was an accordion locked open with its trigger disabled."
      >
        <div className="w-[48rem]">
          <Card>
            {serviceHeader(SERVICES[0])}
            {serviceSchema(SERVICES[0])}
          </Card>
        </div>
      </CallSite>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// lib/hooks/laboratory/use-operation-collections-plugin.tsx:301
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
    <Accordion
      variant="plain"
      chevron="none"
      multiple
      value={value}
      onValueChange={setValue}
      items={COLLECTIONS.map(collection => ({
        value: collection.id,
        label: (
          <span className="inline-flex items-center gap-x-3">
            {value.includes(collection.id) ? (
              <FolderOpenIcon className="size-4" />
            ) : (
              <FolderIcon className="size-4" />
            )}
            {collection.name}
          </span>
        ),
        attrs: { 'data-cy': 'collection-item' },
        triggerAttrs: { 'data-cy': 'collection-item-trigger' },
        action: (
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
        ),
        content: (
          <div className="space-y-0 pb-2 pl-2">
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
          </div>
        ),
      }))}
      attrs={{ id: 'laboratory-collections' }}
    />
  );
}

export const LaboratoryCollectionsPreview = createPreview({
  label: 'Laboratory collections',
  render: () => (
    <CallSite
      source="lib/hooks/laboratory/use-operation-collections-plugin.tsx:301"
      origin="base"
      note="The laboratory sidebar. No chevron; folder icons in the label swap on the open set. The menu comes through action, beside the trigger and outside it. Multiple open, controlled so a collection can be opened from the URL, and the root carries an id the page scrolls within. Three e2e hooks: collection-item on the item, collection-item-trigger on the trigger, collection-menu-trigger on the menu button."
    >
      <div className="w-72">
        <Collections />
      </div>
    </CallSite>
  ),
});
