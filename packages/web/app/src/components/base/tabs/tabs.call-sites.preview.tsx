import { useState, type ReactNode } from 'react';
import { Check, Circle, TriangleAlertIcon, XIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { cn } from '@/lib/utils';
import { Badge } from '../badge/badge';
import { Tabs, type TabItem } from './tabs';

export const nav: NavPath = 'Base/Primitives/Tabs/Component Examples';

/**
 * Every base Tabs mount, transcribed with its real copy. The dialog, sheet and editor around them
 * run queries, forms or Monaco, so each strip is drawn with its panels stood in by a line of text.
 *
 * History: all of these were `ui/tabs` (Radix) until round 7, on its `content` variant with the
 * list restyled per site, and the trace strips were hand-rolled buttons with a blue underline.
 */

const ENTRIES = [
  {
    source: 'components/layouts/target.tsx:487',
    origin: 'base',
    what: 'CDN access dialog: five gateways, the instructions for each in its panel',
    coveredBy: 'CDN dialog',
  },
  {
    source: 'components/project/settings/composition.tsx:103',
    origin: 'base',
    what: 'Composition mode, the configured one marked with a check',
    coveredBy: 'Composition',
  },
  {
    source:
      'components/organization/settings/single-sign-on/connect-single-sign-on-provider-sheet.tsx:308',
    origin: 'base',
    what: 'Discovery document vs manual inside the OIDC sheet; the e2e hooks land on the tabs',
    coveredBy: 'SSO sheet',
  },
  {
    source: 'components/organization/members/resource-selector.tsx:704',
    origin: 'base',
    what: 'Full vs granular access, the value derived from the selection',
    coveredBy: 'Resource selector',
  },
  {
    source: 'pages/target-proposals-new.tsx:574',
    origin: 'base',
    what: 'The new-proposal sections as a vertical strip beside the panels',
    coveredBy: 'New proposal',
  },
  {
    source: 'components/target/proposals/editor.tsx:268',
    origin: 'base',
    what: 'One tab per changed service: a green dot for a new one, a conflict tooltip, close on the active tab',
    coveredBy: 'Service tabs',
  },
  {
    source: 'pages/target-trace.tsx:811 and pages/target-trace.tsx:1517',
    origin: 'base',
    what: 'Span views in the trace panel and the span sheet, sm, with a count per tab',
    coveredBy: 'Span views',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/tabs"
      summary={
        <>
          Eight strips in seven files. Four switch a panel the strip owns, one is vertical, one
          drives a Monaco editor per service, and the two trace strips are drawn at <code>sm</code>{' '}
          with Badge counts in their labels. The checks and version pages are on TabbedView and the
          navigation mounts on SecondaryNavigation; see their own examples.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

function Copy({ children }: { children: ReactNode }) {
  return <p className="text-neutral-11 text-sm">{children}</p>;
}

// ---------------------------------------------------------------------------
// components/layouts/target.tsx:487
// ---------------------------------------------------------------------------

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
    content: (
      <Copy>
        Start up a Apollo Router instance polling the supergraph from the Hive CDN using the
        following command.
      </Copy>
    ),
  },
  {
    value: 'grafbase-gateway',
    label: 'Grafbase Gateway',
    content: (
      <Copy>
        Start up a Grafbase Gateway instance polling the supergraph from the Hive CDN using the
        following command.
      </Copy>
    ),
  },
  {
    value: 'cdn',
    label: 'Custom / HTTP',
    content: (
      <Copy>For other tooling you can access the raw supergraph by sending a HTTP request.</Copy>
    ),
  },
];

export const CdnDialog = createPreview({
  label: 'CDN dialog',
  render: () => (
    <CallSite
      source="components/layouts/target.tsx:487"
      origin="base"
      note="Inside the Hive CDN Access dialog, for a federation target. The wrapper keeps a 300px minimum so the dialog does not resize between panels."
    >
      <div className="mt-2 flex min-h-[120px] grow flex-col text-sm">
        <Tabs items={GATEWAYS} defaultValue="hive-gateway" />
      </div>
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/project/settings/composition.tsx:103
// ---------------------------------------------------------------------------

function Composition() {
  const activeMode = 'external';
  const [selectedMode, setSelectedMode] = useState<string>();
  const mark = (value: string, label: string) => (
    <>
      {label}
      {activeMode === value && <Check size={16} />}
    </>
  );
  return (
    <Tabs
      value={selectedMode ?? activeMode}
      onValueChange={setSelectedMode}
      items={[
        {
          value: 'native',
          label: mark('native', 'Native Federation v2'),
          content: (
            <Copy>
              Recommended for most users. Use native GraphQL Federation v2 composition for your
              project.
            </Copy>
          ),
        },
        {
          value: 'external',
          label: mark('external', 'External'),
          content: <Copy>Compose with your own composition service.</Copy>,
        },
        {
          value: 'legacy',
          label: mark('legacy', 'Legacy Federation v1'),
          content: <Copy>Legacy Federation v1 composition.</Copy>,
        },
      ]}
    />
  );
}

export const CompositionPreview = createPreview({
  label: 'Composition',
  render: () => (
    <CallSite
      source="components/project/settings/composition.tsx:103"
      origin="base"
      note="The check marks the mode the project is configured with; the selected tab is whichever the viewer is reading about. Here External is configured."
    >
      <Composition />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// connect-single-sign-on-provider-sheet.tsx:308
// ---------------------------------------------------------------------------

function SsoSheet() {
  const [state, setState] = useState<'discovery' | 'manual'>('discovery');
  return (
    <Tabs
      value={state}
      onValueChange={value => setState(value === 'manual' ? 'manual' : 'discovery')}
      items={[
        {
          value: 'discovery',
          label: 'Discovery Document',
          attrs: { 'data-button-oidc-discovery': '' },
          content: <Copy>The metadata fetcher, then the form with its endpoints filled in.</Copy>,
        },
        {
          value: 'manual',
          label: 'Manual',
          attrs: { 'data-button-oidc-manual': '' },
          content: <Copy>The form, with the endpoints editable.</Copy>,
        },
      ]}
    />
  );
}

export const SsoSheetPreview = createPreview({
  label: 'SSO sheet',
  render: () => (
    <CallSite
      source="components/organization/settings/single-sign-on/connect-single-sign-on-provider-sheet.tsx:308"
      origin="base"
      note="Inside the Connect OpenID Connect Provider sheet. The two tabs carry the e2e hooks as data attributes."
    >
      <SsoSheet />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/organization/members/resource-selector.tsx:704
// ---------------------------------------------------------------------------

function ResourceSelector() {
  const [mode, setMode] = useState('granular');
  return (
    <Tabs
      value={mode}
      onValueChange={setMode}
      items={[
        {
          value: 'full',
          label: 'Full Access',
          content: (
            <p className="text-sm">
              The permissions are granted on all projects, targets and services within the
              organization.
            </p>
          ),
        },
        {
          value: 'granular',
          label: 'Granular Access',
          content: (
            <p className="mb-4 text-sm">The permissions are granted on the specified resources.</p>
          ),
        },
      ]}
    />
  );
}

export const ResourceSelectorPreview = createPreview({
  label: 'Resource selector',
  render: () => (
    <CallSite
      source="components/organization/members/resource-selector.tsx:704"
      origin="base"
      note="In the role mapping and access token sheets. The value is derived from the selection and choosing a tab rewrites it; the granular panel goes on to the project and target columns."
    >
      <ResourceSelector />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-proposals-new.tsx:574
// ---------------------------------------------------------------------------

export const NewProposal = createPreview({
  label: 'New proposal',
  render: () => (
    <CallSite
      source="pages/target-proposals-new.tsx:574"
      origin="base"
      note="The only vertical strip. The Submit Proposal button that used to sit inside the list now lives in the page heading."
    >
      <Tabs
        orientation="vertical"
        defaultValue="editor"
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: <Copy>Title and description of the proposal.</Copy>,
          },
          {
            value: 'editor',
            label: 'Editor',
            content: <Copy>One editor per changed service.</Copy>,
          },
          {
            value: 'changes',
            label: 'Changes',
            content: <Copy>The diff against the current schema.</Copy>,
          },
        ]}
      />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// components/target/proposals/editor.tsx:268
// ---------------------------------------------------------------------------

const SERVICES = [
  { id: 's1', name: 'accounts', unpublished: false, conflict: false },
  { id: 's2', name: 'reviews', unpublished: false, conflict: false },
  { id: '', name: 'accounts', unpublished: true, conflict: true },
];

function ServiceTabs() {
  const [active, setActive] = useState('tab-s1');
  return (
    <Tabs
      value={active}
      onValueChange={setActive}
      items={SERVICES.map((service, idx) => {
        const value = service.id ? `tab-${service.id}` : `new-${idx}`;
        return {
          value,
          label: (
            <>
              {service.unpublished ? (
                <Circle
                  className="-ml-2 size-4 p-1 text-green-600"
                  fill="currentColor"
                  strokeWidth={0}
                />
              ) : null}
              {service.name}
              {service.conflict ? <TriangleAlertIcon className="size-4 text-red-600" /> : null}
              <span className="ml-2">
                <XIcon className={cn('size-4', active !== value && 'hidden')} />
              </span>
            </>
          ),
          tooltip: service.conflict
            ? 'New service name cannot match an existing service name'
            : undefined,
          content: (
            <div className="rounded-sm border">
              <div className="flex items-center justify-end border-b px-2 py-1 text-xs">
                prettify, settings
              </div>
              <div className="p-4">
                <Copy>The diff editor for {service.name}.</Copy>
              </div>
            </div>
          ),
        };
      })}
    />
  );
}

export const ServiceTabsPreview = createPreview({
  label: 'Service tabs',
  render: () => (
    <CallSite
      source="components/target/proposals/editor.tsx:268"
      origin="base"
      note="A published service is keyed by id, a new one by position. The third tab is a new service named like an existing one: the warning icon and the tooltip say so, and its name is edited in the settings popover behind the gear rather than in the tab. Close shows on the active tab only."
    >
      <ServiceTabs />
    </CallSite>
  ),
});

// ---------------------------------------------------------------------------
// pages/target-trace.tsx:811 and 1517
// ---------------------------------------------------------------------------

function CountedLabel(props: { label: string; count: number }) {
  return (
    <>
      {props.label}
      <Badge content={String(props.count)} variants={{ variant: 'secondary', size: 'sm' }} />
    </>
  );
}

export const SpanViews = createPreview({
  label: 'Span views',
  render: () => (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-trace.tsx:811"
        origin="base"
        note="The panel under the trace timeline, sticky at its top. The views render below from state, so the items carry no content."
      >
        <Tabs
          size="sm"
          defaultValue="span-attributes"
          items={[
            { value: 'span-attributes', label: <CountedLabel label="Attributes" count={8} /> },
            {
              value: 'resource-attributes',
              label: <CountedLabel label="Resource Attributes" count={3} />,
            },
            { value: 'events', label: <CountedLabel label="Events" count={0} /> },
            { value: 'operation', label: 'GraphQL Operation' },
          ]}
        />
      </CallSite>
      <CallSite
        source="pages/target-trace.tsx:1517"
        origin="base"
        note="The span sheet's strip. GraphQL Operation only appears when the span carries a document."
      >
        <div className="border-neutral-5 border-t">
          <Tabs
            size="sm"
            defaultValue="span-attributes"
            items={[
              {
                value: 'span-attributes',
                label: <CountedLabel label="Span Attributes" count={12} />,
              },
              {
                value: 'resource-attributes',
                label: <CountedLabel label="Resource Attributes" count={3} />,
              },
              { value: 'events', label: <CountedLabel label="Events" count={2} /> },
              { value: 'operation', label: 'GraphQL Operation' },
            ]}
          />
        </div>
      </CallSite>
    </div>
  ),
});
