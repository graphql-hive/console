import { useState, type ReactNode } from 'react';
import { FolderIcon, FolderOpenIcon, MoreHorizontal, Plus } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Badge } from '../badge/badge';
import { Menu } from '../floating/menu/menu';
import { Accordion } from './accordion';

export const nav: NavPath = 'Base/Primitives/Accordion';

/**
 * Items in, an accordion out, on Base UI. One trigger look: medium text, the chevron at the end,
 * no underline on hover.
 */

function Copy({ children }: { children: ReactNode }) {
  return <p className="text-fg-default text-sm">{children}</p>;
}

function Labelled(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-fg-secondary text-xs">{props.label}</span>
      {props.children}
    </div>
  );
}

const CHANGES = [
  {
    value: 'breaking',
    label: 'Breaking changes',
    body: 'Field User.email was removed from type User.',
  },
  {
    value: 'dangerous',
    label: 'Dangerous changes',
    body: 'Enum value PENDING was added to Status.',
  },
  { value: 'safe', label: 'Safe changes', body: 'Description on type Query has changed.' },
];

export const Default = createPreview(() => (
  <div className="w-96">
    <Accordion
      items={CHANGES.map(change => ({
        value: change.value,
        label: change.label,
        content: <Copy>{change.body}</Copy>,
      }))}
    />
  </div>
));

/** `defaultValue` opens items on mount; `multiple` lets more than one stay open. */
export const DefaultOpen = createPreview(() => (
  <div className="flex w-96 flex-col gap-10">
    <Labelled label="single, the default: opening one closes the other">
      <Accordion
        defaultValue={['breaking']}
        items={CHANGES.map(change => ({
          value: change.value,
          label: change.label,
          content: <Copy>{change.body}</Copy>,
        }))}
      />
    </Labelled>
    <Labelled label="multiple">
      <Accordion
        multiple
        defaultValue={['breaking', 'safe']}
        items={CHANGES.map(change => ({
          value: change.value,
          label: change.label,
          content: <Copy>{change.body}</Copy>,
        }))}
      />
    </Labelled>
  </div>
));

const PERMISSION_GROUPS = [
  { value: 'Organization', selected: 2, total: 4 },
  { value: 'Project', selected: 0, total: 3 },
  { value: 'Schema Registry', selected: 3, total: 3 },
];

/**
 * members/permission-selector.tsx: the open set held by the form, a count at the trigger's far
 * end. `trailing` sits before the chevron.
 */
export const Controlled = createPreview(() => {
  const [open, setOpen] = useState<string[]>([]);
  return (
    <div className="w-[36rem]">
      <Accordion
        multiple
        value={open}
        onValueChange={setOpen}
        items={PERMISSION_GROUPS.map(group => ({
          value: group.value,
          label: group.value,
          trailing: group.selected ? (
            <span className="text-fg-secondary text-xs">{group.selected} selected</span>
          ) : undefined,
          content: <Copy>{group.total} permissions in this group.</Copy>,
        }))}
      />
      <p className="text-fg-secondary mt-3 text-xs">Open: {open.join(', ') || 'none'}</p>
    </div>
  );
});

const SERVICES = [
  { id: 's1', service: 'users', url: 'https://users.storefront.local/graphql' },
  { id: 's2', service: 'products', url: 'https://products.storefront.local/graphql' },
];

/** pages/target.tsx: `boxed`, each service a card with a two-line header and its SDL inside. */
export const Boxed = createPreview(() => (
  <div className="w-[40rem]">
    <Accordion
      variant="boxed"
      items={SERVICES.map(schema => ({
        value: schema.id,
        label: (
          <div>
            <div className="text-fg text-base">{schema.service}</div>
            <div className="text-fg-secondary text-xs font-normal">{schema.url}</div>
          </div>
        ),
        content: (
          <pre className="text-fg-default font-mono text-xs leading-relaxed">
            {'type Query {\n  me: User\n}'}
          </pre>
        ),
      }))}
    />
  </div>
));

/**
 * alerts/alert-form.tsx, Advanced settings: `plain`, so no hairline under a lone disclosure;
 * small, the chevron at the start, and the accent tone to call it out.
 */
export const SmallAccentDisclosure = createPreview(() => (
  <div className="bg-neutral-2 dark:bg-neutral-3 border-line w-[28rem] rounded-md border p-4">
    <Accordion
      variant="plain"
      size="sm"
      chevron="start"
      tone="accent"
      items={[
        {
          value: 'advanced',
          label: 'Advanced settings',
          content: <Copy>On filter, hold minutes.</Copy>,
        },
      ]}
    />
  </div>
));

const COLLECTIONS = [
  { id: 'c1', name: 'Onboarding', operations: ['GetViewer', 'ListProjects'] },
  { id: 'c2', name: 'Regression', operations: ['PublishSchema'] },
];

/**
 * laboratory collections: no chevron, folder icons in the label that swap on open, and a menu
 * beside the trigger through `action`, which stays outside the trigger button.
 */
export const WithAction = createPreview(() => {
  const [open, setOpen] = useState<string[]>(['c1']);
  return (
    <div className="w-72">
      <Accordion
        multiple
        chevron="none"
        value={open}
        onValueChange={setOpen}
        items={COLLECTIONS.map(collection => ({
          value: collection.id,
          label: (
            <span className="inline-flex items-center gap-x-3">
              {open.includes(collection.id) ? (
                <FolderOpenIcon className="size-4" />
              ) : (
                <FolderIcon className="size-4" />
              )}
              {collection.name}
            </span>
          ),
          action: (
            <Menu
              align="end"
              trigger={
                <button
                  type="button"
                  aria-label="More"
                  className="hover:bg-neutral-4 rounded-sm p-1"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              }
              sections={[
                [{ label: 'Add operation', trailingIcon: Plus, onClick: () => {} }],
                [
                  { label: 'Edit', onClick: () => {} },
                  { label: 'Delete', variant: 'destructiveAction', onClick: () => {} },
                ],
              ]}
            />
          ),
          content: (
            <ul className="text-fg-default space-y-1 pl-2 text-sm">
              {collection.operations.map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ),
          attrs: { 'data-cy': 'collection-item' },
        }))}
      />
    </div>
  );
});

/** A disabled item keeps its place and its label, and cannot open. */
export const Disabled = createPreview(() => (
  <div className="w-96">
    <Accordion
      items={[
        { value: 'a', label: 'Composition errors', content: <Copy>None.</Copy> },
        {
          value: 'b',
          label: (
            <span className="inline-flex items-center gap-2">
              Breaking changes
              <Badge content="approved" variants={{ variant: 'secondary', size: 'sm' }} />
            </span>
          ),
          content: <Copy>Two, both approved.</Copy>,
          disabled: true,
        },
      ]}
    />
  </div>
));

export const Playground = createPreview({
  controls: controlsFor(Accordion, {
    variant: { type: 'radio', options: ['list', 'boxed', 'plain'], default: 'list' },
    size: { type: 'radio', options: ['default', 'sm'], default: 'default' },
    chevron: { type: 'radio', options: ['end', 'start', 'none'], default: 'end' },
    tone: { type: 'radio', options: ['default', 'accent'], default: 'default' },
    multiple: { type: 'boolean', default: false },
    keepMounted: { type: 'boolean', default: false },
  }),
  render: v => (
    <div className="w-[32rem]">
      <Accordion
        variant={v.variant}
        size={v.size}
        chevron={v.chevron}
        tone={v.tone}
        multiple={v.multiple}
        keepMounted={v.keepMounted}
        items={CHANGES.map((change, index) => ({
          value: change.value,
          label: change.label,
          trailing: index === 0 ? <span className="text-fg-secondary text-xs">2</span> : undefined,
          content: <Copy>{change.body}</Copy>,
        }))}
      />
    </div>
  ),
});
