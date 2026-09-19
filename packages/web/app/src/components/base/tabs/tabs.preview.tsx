import { useState, type ReactNode } from 'react';
import { Box, Check, FileCode2, GitCompare, Layers, List } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { Badge } from '../badge/badge';
import { Select } from '../floating/select/select';
import { TabbedView, type TabbedViewItem } from './tabbed-view';
import { Tabs, type TabItem } from './tabs';

export const nav: NavPath = 'Base/Primitives/Tabs';

/**
 * Items in, a tab strip out, with a sliding indicator and panels when the items carry content.
 * Replaces `ui/tabs` for the mounts that are tabs; the ones that are navigation move to
 * `SecondaryNavigation`, the checks and version pages to `TabbedView`, and the laboratory's page
 * switch to `ToggleGroup`. Each look below is drawn with the call sites it would ship at, real
 * copy included.
 */

// ---------------------------------------------------------------------------
// The call sites, as items
// ---------------------------------------------------------------------------

function Copy({ children }: { children: ReactNode }) {
  return <p className="text-neutral-11 text-sm">{children}</p>;
}

/** project/settings/composition.tsx: the active mode carries a check. */
function compositionItems(active: string): TabItem[] {
  const mark = (value: string, label: string) => (
    <>
      {label}
      {active === value ? <Check className="size-4" /> : null}
    </>
  );
  return [
    {
      value: 'native',
      label: mark('native', 'Native Federation v2'),
      content: <Copy>Native composition settings.</Copy>,
    },
    {
      value: 'external',
      label: mark('external', 'External'),
      content: <Copy>External composition settings.</Copy>,
    },
    {
      value: 'legacy',
      label: mark('legacy', 'Legacy Federation v1'),
      content: <Copy>Legacy composition settings.</Copy>,
    },
  ];
}

/** layouts/target.tsx: the CDN access dialog. */
const GATEWAYS: TabItem[] = [
  {
    value: 'hive-gateway',
    label: 'Hive Gateway',
    content: (
      <Copy>
        Start up a Hive Gateway instance polling the supergraph from the Hive CDN using the
        following command.
      </Copy>
    ),
  },
  {
    value: 'hive-router',
    label: 'Hive Router',
    content: (
      <Copy>
        Start up a Hive Router instance polling the supergraph from the Hive CDN using the following
        command.
      </Copy>
    ),
  },
  {
    value: 'apollo-router',
    label: 'Apollo Router',
    content: <Copy>Apollo Router instructions.</Copy>,
  },
  {
    value: 'grafbase-gateway',
    label: 'Grafbase Gateway',
    content: <Copy>Grafbase Gateway instructions.</Copy>,
  },
  { value: 'cdn', label: 'Custom / HTTP', content: <Copy>Fetch the artifacts over HTTP.</Copy> },
];

/** single-sign-on/connect-single-sign-on-provider-sheet.tsx, inside the sheet. */
const SSO: TabItem[] = [
  {
    value: 'discovery',
    label: 'Discovery Document',
    content: <Copy>Metadata fetcher, then the form.</Copy>,
  },
  { value: 'manual', label: 'Manual', content: <Copy>The form.</Copy> },
];

/** members/resource-selector.tsx, inside the role mapping sheet. */
const ACCESS: TabItem[] = [
  {
    value: 'full',
    label: 'Full Access',
    content: (
      <Copy>
        The permissions are granted on all projects, targets and services within the organization.
      </Copy>
    ),
  },
  {
    value: 'granular',
    label: 'Granular Access',
    content: <Copy>The permissions are granted on the specified resources.</Copy>,
  },
];

/** pages/target-history-schema-version.tsx: the version views, rendered by the page. */
const VERSION_VIEWS: TabItem[] = [
  { value: 'details', label: 'Summary', icon: List },
  { value: 'full-schema', label: 'Schema', icon: FileCode2 },
  { value: 'supergraph', label: 'Supergraph', icon: Layers },
  { value: 'service-schema', label: 'Subgraphs', icon: Box },
];

/** pages/target-trace.tsx: the span sheet's strip, hand-rolled today, with a count per tab. */
const counted = (label: string, count: number) => (
  <>
    {label}
    <Badge content={String(count)} variants={{ variant: 'secondary', size: 'sm' }} />
  </>
);
const SPAN_VIEWS: TabItem[] = [
  { value: 'span-attributes', label: counted('Span Attributes', 8) },
  { value: 'resource-attributes', label: counted('Resource Attributes', 3) },
  { value: 'events', label: counted('Events', 0) },
  { value: 'operation', label: 'GraphQL Operation' },
];

/** pages/target-checks-single.tsx: the check views, which TabbedView carries. */
const checkViews = (contract: string): TabbedViewItem[] => [
  { value: 'details', label: 'Details', icon: List, content: <Copy>Details of {contract}.</Copy> },
  {
    value: 'schema',
    label: 'Public Schema',
    icon: GitCompare,
    content: <Copy>The public schema of {contract}.</Copy>,
  },
  {
    value: 'supergraph',
    label: 'Supergraph',
    icon: GitCompare,
    disabled: true,
    tooltip: 'Composition did not succeed. No Supergraph available.',
    content: null,
  },
];

const CONTRACTS = [
  { value: 'default', label: 'Default Graph' },
  { value: 'public-api', label: 'public-api' },
  { value: 'partner-api', label: 'partner-api' },
];

// ---------------------------------------------------------------------------
// The looks, each on its own call sites
// ---------------------------------------------------------------------------

/** `underline`, proposed default: every strip that switches a panel or a page-rendered view. */
export const Underline = createPreview(() => {
  const [mode, setMode] = useState('native');
  const [view, setView] = useState('details');
  return (
    <div className="flex flex-col gap-10">
      <Labelled label="project/settings/composition.tsx (was content variant; the legacy tab was dimmed by className, which base does not do)">
        <Tabs items={compositionItems(mode)} value={mode} onValueChange={setMode} />
      </Labelled>
      <Labelled label="layouts/target.tsx, the CDN access dialog (was content variant)">
        <Tabs items={GATEWAYS} defaultValue="hive-gateway" />
      </Labelled>
      <Labelled label="connect-single-sign-on-provider-sheet.tsx (was content variant)">
        <Tabs items={SSO} defaultValue="discovery" />
      </Labelled>
      <Labelled label="members/resource-selector.tsx (was content variant)">
        <Tabs items={ACCESS} defaultValue="granular" />
      </Labelled>
      <Labelled label="pages/target-history-schema-version.tsx, the version views (was content variant with icons; the page renders the view). Only if the history page stays off TabbedView; with it, these are the band.">
        <div className="flex flex-col">
          <Tabs items={VERSION_VIEWS} value={view} onValueChange={setView} />
          <Copy>The {view} view, rendered by the page.</Copy>
        </div>
      </Labelled>
      <Labelled label="pages/target-trace.tsx, the span sheet strip (was hand-rolled at text-xs), sm">
        <Tabs items={SPAN_VIEWS} defaultValue="span-attributes" size="sm" />
      </Labelled>
    </div>
  );
});

const SERVICES = [
  'users',
  'products',
  'reviews',
  'inventory',
  'orders',
  'billing',
  'search',
  'notifications',
  'analytics',
  'support',
  'admin',
  'legacy-web',
];

/**
 * A strip scrolls sideways once its tabs outgrow it, scrollbar hidden: swipe, drag, or walk the
 * tabs with the arrow keys and the focused one scrolls into view. Both frames below are flex
 * columns, the layout that used to stretch to fit every tab and push the page sideways, since a
 * flex item is at least as wide as its content unless told otherwise. The strip now keeps its
 * tabs out of that measurement, so the column stays the width it was given.
 */
export const ManyTabs = createPreview(() => {
  const [service, setService] = useState(SERVICES[0]);
  const [view, setView] = useState(SERVICES[0]);
  return (
    <div className="flex flex-col gap-10">
      <Labelled label="proposals/editor.tsx, the service strip, in a two-column layout at 40rem">
        <div className="border-neutral-5 flex w-[40rem] rounded-md border">
          <div className="border-neutral-5 text-neutral-10 w-40 shrink-0 border-r p-3 text-xs">
            Services
          </div>
          <div className="flex flex-1 flex-col p-3">
            <Tabs
              items={SERVICES.map(name => ({ value: name, label: name }))}
              value={service}
              onValueChange={setService}
            />
            <Copy>The {service} subgraph's editor.</Copy>
          </div>
        </div>
      </Labelled>
      <Labelled label="The band, with the picker leading the strip, in a flex column at 32rem">
        <div className="flex w-[32rem] flex-col">
          <TabbedView
            value={view}
            onValueChange={setView}
            action={
              <Select
                aria-label="Contract"
                options={[{ value: 'default', label: 'Default Graph' }]}
                value="default"
                size="compact"
                onSurface="raised"
                width="sm"
              />
            }
            items={SERVICES.slice(0, 8).map(name => ({
              value: name,
              label: name,
              content: <Copy>The {name} view.</Copy>,
            }))}
          />
        </div>
      </Labelled>
    </div>
  );
});

/** `header`: the strip TabbedView puts in its band. The checks and version pages. */
export const Header = createPreview(() => {
  const [contract, setContract] = useState('default');
  return (
    <Labelled label="pages/target-checks-single.tsx, through TabbedView; see Components/TabbedView for the page">
      <TabbedView
        items={checkViews(contract)}
        defaultValue="details"
        action={
          <Select
            aria-label="Contract"
            options={CONTRACTS}
            value={contract}
            onValueChange={setContract}
            size="compact"
            onSurface="raised"
            width="md"
          />
        }
      />
    </Labelled>
  );
});

/** A column of tabs with the panels beside them: the new-proposal page's sections. */
export const Vertical = createPreview(() => (
  <Labelled label="pages/target-proposals-new.tsx (was orientation=vertical with a restyled content list)">
    <Tabs
      orientation="vertical"
      items={[
        {
          value: 'overview',
          label: 'Overview',
          content: <Copy>Title and description of the proposal.</Copy>,
        },
        { value: 'editor', label: 'Editor', content: <Copy>One editor per changed service.</Copy> },
        {
          value: 'changes',
          label: 'Changes',
          content: <Copy>The diff against the current schema.</Copy>,
        },
      ]}
      defaultValue="editor"
    />
  </Labelled>
));

export const Playground = createPreview({
  controls: controlsFor(Tabs, {
    variant: { type: 'radio', options: ['underline', 'header'], default: 'underline' },
    size: { type: 'radio', options: ['default', 'sm'], default: 'default' },
    orientation: { type: 'radio', options: ['horizontal', 'vertical'], default: 'horizontal' },
  }),
  render: v => (
    <Tabs
      items={GATEWAYS}
      defaultValue="hive-gateway"
      variant={v.variant}
      size={v.size}
      orientation={v.orientation}
    />
  ),
});

function Labelled(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-neutral-10 text-xs">{props.label}</span>
      {props.children}
    </div>
  );
}
