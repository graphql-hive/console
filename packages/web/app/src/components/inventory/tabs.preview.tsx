import { useState } from 'react';
import {
  AlertTriangle,
  Box,
  Check,
  FileCode2,
  GitCompare,
  Layers,
  List,
  Pencil,
  PieChart,
  X,
} from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CallSite, CallSiteGroup, InventoryList } from './shared';

export const nav: NavPath = 'Inventory/Tabs';

/**
 * `ui/tabs`: Radix Tabs with three cva variants (`default` pill list, `menu` underline, `content`
 * bottom border). Sixteen mounts in thirteen files, transcribed here on the old component with the
 * pages' data mocked. Icons are lucide stand-ins where the source uses the Radix or ui icon sets.
 *
 * Grouped by what each mount actually is, because three of them are not tabs: they are
 * navigation with links inside, styled as tabs.
 */

const ENTRIES = [
  {
    source: 'navigation/secondary-navigation.tsx:28 (+ secondary-nav-link.tsx)',
    origin: 'ui',
    what: 'Org, project and target sub-navigation: TabsTrigger asChild around router links, menu variant',
    coveredBy: 'Navigation as tabs',
  },
  {
    source: 'pages/target-proposal.tsx:514',
    origin: 'ui',
    what: 'Proposal page sections, links with icons, menu variant, plus a TabsContent for one section',
    coveredBy: 'Navigation as tabs',
  },
  {
    source: 'pages/target-proposals-new.tsx:555',
    origin: 'ui',
    what: 'The only orientation="vertical": a column whose value drives three TabsContent panels; the triggers wrap Link elements with no destination, and a submit button sits inside the list',
    coveredBy: 'Tabs with panels',
  },
  {
    source: 'target/explorer/filter.tsx:70',
    origin: 'ui',
    what: 'All / Unused / Deprecated: links in a pill list, each under a tooltip, active one re-styled by className',
    coveredBy: 'Navigation as tabs',
  },
  {
    source: 'layouts/target.tsx:487',
    origin: 'ui',
    what: 'CDN access dialog: five gateways, content variant with TabsContent panels',
    coveredBy: 'Tabs with panels',
  },
  {
    source: 'project/settings/composition.tsx:104',
    origin: 'ui',
    what: 'Composition mode: three panels, the active mode marked with a check, legacy dimmed by className',
    coveredBy: 'Tabs with panels',
  },
  {
    source: 'single-sign-on/connect-single-sign-on-provider-sheet.tsx:308',
    origin: 'ui',
    what: 'Discovery vs manual inside a sheet: two panels, value driven by onClick rather than onValueChange',
    coveredBy: 'Tabs with panels',
  },
  {
    source: 'members/resource-selector.tsx:655',
    origin: 'ui',
    what: 'Full vs granular access: value derived from the selection, onClick mutates it, panels for each',
    coveredBy: 'Tabs with panels',
  },
  {
    source: 'pages/target-checks-single.tsx:679',
    origin: 'ui',
    what: 'Check views: boxed list with border-x border-b, icons, disabled items, the view rendered below by state',
    coveredBy: 'View switches',
  },
  {
    source: 'pages/target-checks-single.tsx:1004',
    origin: 'ui',
    what: 'Contract check views: same box, disabled items carry a tooltip saying why',
    coveredBy: 'View switches',
  },
  {
    source: 'pages/target-checks-single.tsx:1248 and target-history-schema-version.tsx:315',
    origin: 'ui',
    what: 'Default graph plus one tab per contract: file-tab look (rounded-b-none border) with a status icon each',
    coveredBy: 'View switches',
  },
  {
    source: 'pages/target-history-schema-version.tsx:380',
    origin: 'ui',
    what: 'Version views: content variant with icons, the view rendered below by state',
    coveredBy: 'View switches',
  },
  {
    source: 'target/proposals/editor.tsx:272',
    origin: 'ui',
    what: 'One tab per changed service, scrollable, asChild div with an editable name, a conflict popover and a close X',
    coveredBy: 'View switches',
  },
  {
    source: 'pages/target-laboratory.tsx:460 and target-laboratory-new.tsx:800',
    origin: 'ui',
    what: 'GraphiQL vs Hive Laboratory: a two-item pill next to the title, no panels',
    coveredBy: 'Segmented toggle',
  },
  {
    source: 'pages/target-trace.tsx:233 (TabButton)',
    origin: 'raw',
    what: 'Hand-rolled tab strip in the span sheet: border-b-2 buttons with Badge counts',
    coveredBy: 'View switches',
  },
  {
    source: 'ui/tabs.tsx:74',
    origin: 'ui',
    what: 'hasBorder prop: read, defaulted to true, and passed to cn() as a boolean, so it does nothing; no call site sets it',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="ui/tabs"
      summary={
        <>
          <strong>Sixteen mounts in thirteen files, and three of them are navigation.</strong> The
          org, project and target sub-navigation, the proposal page sections and the explorer filter
          all wrap router links in <code>TabsTrigger asChild</code>. They render{' '}
          <code>role=&quot;tab&quot;</code> on anchors that change the URL, with no tab panel
          anywhere. Those want a navigation component, not Tabs. The new-proposal sidebar looks the
          same but is real tabs: its value drives three panels, and its triggers wrap{' '}
          <code>Link</code> elements that have no destination.
          <br />
          <br />
          <strong>Three variants, and every list overrides them anyway.</strong>{' '}
          <code>default</code> is a pill list (7 lists), <code>menu</code> an underline (2 lists, 9
          triggers), <code>content</code> a bottom border (5 lists, 7 triggers). Fourteen of the
          sixteen lists pass a className, and two shapes recur that no variant covers: the boxed
          list on the checks page (<code>border-x border-b rounded-none w-full justify-start</code>)
          and the file-tab contract picker (<code>rounded-b-none border</code> per trigger, active
          fill matching the panel below).
          <br />
          <br />
          <strong>Panels are the minority.</strong> <code>TabsContent</code> appears in 7 of 16
          mounts. The rest keep the value in state and render the view below the list themselves, so
          the list is a segmented control over a region it is not wired to.
          <br />
          <br />
          <strong>Dead:</strong> the <code>hasBorder</code> prop. <code>orientation</code> is used
          once, for the new-proposal sidebar.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

// ---------------------------------------------------------------------------
// Navigation rendered as tabs: links inside TabsTrigger asChild.
// ---------------------------------------------------------------------------

export const NavigationAsTabs = createPreview({
  label: 'Navigation as tabs',
  render: () => <NavigationExamples />,
});

const TARGET_NAV = [
  'Schema',
  'Checks',
  'Explorer',
  'History',
  'Insights',
  'Traces',
  'Apps',
  'Laboratory',
  'Proposals',
  'Alerts',
  'Settings',
];

function NavigationExamples() {
  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="navigation/secondary-navigation.tsx:28"
        origin="ui"
        note="The sub-navigation under every org, project and target header. Each item is a router link rendered through TabsTrigger asChild, so it is an <a role=tab> with no panel. value is the current page."
      >
        <div className="border-neutral-5 bg-neutral-2 dark:bg-neutral-3 relative border-b">
          <Tabs value="schema">
            <TabsList variant="menu">
              {TARGET_NAV.map(label => (
                <TabsTrigger key={label} variant="menu" value={label.toLowerCase()} asChild>
                  <a href="#">{label}</a>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CallSite>

      <CallSite
        source="pages/target-proposal.tsx:514"
        origin="ui"
        note="Proposal sections as links with icons, menu variant on a full-width bottom border. The Details section is also a TabsContent; the others are rendered by the page from the search param."
      >
        <Tabs value="details">
          <TabsList variant="menu" className="border-b-1 w-full">
            <TabsTrigger variant="menu" value="details" asChild>
              <a href="#" className="flex items-center">
                <List className="mr-2 h-5 w-auto flex-none" />
                Details
              </a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="schema" asChild>
              <a href="#" className="flex items-center">
                <GitCompare className="mr-2 h-5 w-auto flex-none" />
                Schema
              </a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="supergraph" asChild>
              <a href="#" className="flex items-center">
                <Layers className="mr-2 h-4 w-auto flex-none" />
                Supergraph Preview
              </a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="checks" asChild>
              <a href="#" className="flex items-center">
                <PieChart className="mr-2 h-4 w-auto flex-none" />
                Checks
              </a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="edit" asChild>
              <a href="#" className="flex items-center">
                <Pencil className="mr-2 h-3 w-auto flex-none" />
                Edit
              </a>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" variant="content" className="w-full">
            <p className="text-neutral-11 text-sm">Proposal details render here.</p>
          </TabsContent>
        </Tabs>
      </CallSite>

      <CallSite
        source="target/explorer/filter.tsx:70"
        origin="ui"
        note="All, Unused and Deprecated are three routes. The active one is a real TabsTrigger restyled by className; the other two are links through asChild. Each sits under a tooltip."
      >
        <Tabs defaultValue="unused">
          <TabsList className="dark:bg-neutral-3 bg-neutral-5">
            {[
              {
                value: 'all',
                label: 'All',
                tooltip: 'Shows all types, including unused and deprecated ones',
              },
              {
                value: 'unused',
                label: 'Unused',
                tooltip: 'Shows only types that are not used in any operation',
              },
              {
                value: 'deprecated',
                label: 'Deprecated',
                tooltip: 'Shows only types that are marked as deprecated',
              },
            ].map(variant => (
              <Tooltip
                key={variant.value}
                trigger={
                  variant.value === 'unused' ? (
                    <div>
                      <TabsTrigger
                        className="dark:data-[state=active]:bg-neutral-5 data-[state=active]:bg-neutral-6 data-[state=active]:text-neutral-12"
                        value={variant.value}
                      >
                        {variant.label}
                      </TabsTrigger>
                    </div>
                  ) : (
                    <TabsTrigger
                      className="text-neutral-9 hover:text-neutral-11"
                      value={variant.value}
                      asChild
                    >
                      <a href="#">{variant.label}</a>
                    </TabsTrigger>
                  )
                }
                content={variant.tooltip}
                side="bottom"
              />
            ))}
          </TabsList>
        </Tabs>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real tabs: a list wired to TabsContent panels.
// ---------------------------------------------------------------------------

export const WithPanels = createPreview({
  label: 'Tabs with panels',
  render: () => <PanelExamples />,
});

function PanelExamples() {
  const [mode, setMode] = useState('native');
  const [section, setSection] = useState('editor');
  const [access, setAccess] = useState('granular');
  const [sso, setSso] = useState('discovery');
  return (
    <div className="flex flex-col gap-8">
      <CallSite
        source="pages/target-proposals-new.tsx:555"
        origin="ui"
        note="The only vertical Tabs, and real tabs: the value drives three TabsContent panels beside the list. The triggers wrap Link elements with no destination, the content list is restyled into a column with menu triggers, and the Submit Proposal button sits inside the TabsList."
      >
        <Tabs orientation="vertical" className="flex" value={section} onValueChange={setSection}>
          <TabsList
            variant="content"
            className={cn(
              'flex h-full w-[20vw] min-w-[160px] flex-col items-start border-0',
              '*:flex *:w-full *:justify-start *:p-3',
            )}
          >
            <TabsTrigger variant="menu" value="overview" asChild>
              <a>Overview</a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="editor" asChild>
              <a>Editor</a>
            </TabsTrigger>
            <TabsTrigger variant="menu" value="changes" asChild className="mb-2">
              <a>Changes</a>
            </TabsTrigger>
            <div className="mt-6">
              <Button variant="ghost" className="mb-10 mt-2 w-full justify-center px-3 font-bold">
                Submit Proposal
              </Button>
            </div>
          </TabsList>
          <div className="w-full flex-col items-start overflow-x-hidden pl-8 *:pt-0">
            <TabsContent value="overview" className="max-w-[600px]">
              <p className="text-neutral-11 text-sm">Title and description of the proposal.</p>
            </TabsContent>
            <TabsContent value="editor">
              <p className="text-neutral-11 text-sm">One editor per changed service.</p>
            </TabsContent>
            <TabsContent value="changes">
              <p className="text-neutral-11 text-sm">The diff against the current schema.</p>
            </TabsContent>
          </div>
        </Tabs>
      </CallSite>

      <CallSite
        source="layouts/target.tsx:487"
        origin="ui"
        note="The CDN access dialog: five gateways on the content variant, each with a TabsContent of instructions. Now inside a base Dialog."
      >
        <Tabs className="mt-2 flex min-h-[120px] grow flex-col text-sm" defaultValue="hive-gateway">
          <TabsList variant="content">
            <TabsTrigger value="hive-gateway" variant="content">
              Hive Gateway
            </TabsTrigger>
            <TabsTrigger value="hive-router" variant="content">
              Hive Router
            </TabsTrigger>
            <TabsTrigger value="apollo-router" variant="content">
              Apollo Router
            </TabsTrigger>
            <TabsTrigger value="grafbase-gateway" variant="content">
              Grafbase Gateway
            </TabsTrigger>
            <TabsTrigger value="cdn" variant="content">
              Custom / HTTP
            </TabsTrigger>
          </TabsList>
          <TabsContent value="hive-gateway" variant="content">
            <p>
              Start up a Hive Gateway instance polling the supergraph from the Hive CDN using the
              following command.
            </p>
          </TabsContent>
          <TabsContent value="hive-router" variant="content">
            <p>
              Start up a Hive Router instance polling the supergraph from the Hive CDN using the
              following command.
            </p>
          </TabsContent>
          <TabsContent value="apollo-router" variant="content">
            <p>Apollo Router instructions.</p>
          </TabsContent>
          <TabsContent value="grafbase-gateway" variant="content">
            <p>Grafbase Gateway instructions.</p>
          </TabsContent>
          <TabsContent value="cdn" variant="content">
            <p>Fetch the artifacts over HTTP.</p>
          </TabsContent>
        </Tabs>
      </CallSite>

      <CallSite
        source="project/settings/composition.tsx:104"
        origin="ui"
        note="Composition mode. The active mode carries a check icon; Legacy is dimmed through className unless it is the active mode."
      >
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList variant="content">
            <TabsTrigger variant="content" value="native">
              Native Federation v2
              <Check size={16} className="ml-2 inline-block" />
            </TabsTrigger>
            <TabsTrigger variant="content" value="external">
              External
            </TabsTrigger>
            <TabsTrigger
              variant="content"
              value="legacy"
              className="opacity-40 hover:opacity-100 data-[state=active]:opacity-100"
            >
              Legacy Federation v1
            </TabsTrigger>
          </TabsList>
          <TabsContent variant="content" value="native">
            <p className="text-neutral-11 text-sm">Native composition settings.</p>
          </TabsContent>
          <TabsContent variant="content" value="external">
            <p className="text-neutral-11 text-sm">External composition settings.</p>
          </TabsContent>
          <TabsContent variant="content" value="legacy">
            <p className="text-neutral-11 text-sm">Legacy composition settings.</p>
          </TabsContent>
        </Tabs>
      </CallSite>

      <CallSite
        source="single-sign-on/connect-single-sign-on-provider-sheet.tsx:308"
        origin="ui"
        note="Inside a sheet. The value is set from each trigger's onClick rather than onValueChange, and both panels render the same form."
      >
        <Tabs value={sso}>
          <TabsList variant="content" className="mt-1">
            <TabsTrigger variant="content" value="discovery" onClick={() => setSso('discovery')}>
              Discovery Document
            </TabsTrigger>
            <TabsTrigger variant="content" value="manual" onClick={() => setSso('manual')}>
              Manual
            </TabsTrigger>
          </TabsList>
          <TabsContent value="discovery" variant="content">
            <p className="text-neutral-11 text-sm">Metadata fetcher, then the form.</p>
          </TabsContent>
          <TabsContent value="manual" variant="content">
            <p className="text-neutral-11 text-sm">The form.</p>
          </TabsContent>
        </Tabs>
      </CallSite>

      <CallSite
        source="members/resource-selector.tsx:655"
        origin="ui"
        note="Full vs granular access in the role mapping sheet. The value is derived from the selection and each trigger's onClick mutates it."
      >
        <Tabs value={access}>
          <TabsList variant="content" className="mt-1">
            <TabsTrigger variant="content" value="full" onClick={() => setAccess('full')}>
              Full Access
            </TabsTrigger>
            <TabsTrigger variant="content" value="granular" onClick={() => setAccess('granular')}>
              Granular Access
            </TabsTrigger>
          </TabsList>
          <TabsContent value="full" variant="content">
            <p className="text-sm">
              The permissions are granted on all projects, targets and services within the
              organization.
            </p>
          </TabsContent>
          <TabsContent value="granular" variant="content">
            <p className="mb-4 text-sm">The permissions are granted on the specified resources.</p>
          </TabsContent>
        </Tabs>
      </CallSite>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View switches: the list holds a value in state and the page renders the view below it.
// ---------------------------------------------------------------------------

export const ViewSwitches = createPreview({
  label: 'View switches',
  render: () => <ViewSwitchExamples />,
});

const CHECK_VIEWS = [
  {
    value: 'details',
    label: 'Details',
    icon: <List className="h-5 w-auto flex-none" />,
    disabled: false,
  },
  {
    value: 'service',
    label: 'Service',
    icon: <GitCompare className="h-5 w-auto flex-none" />,
    disabled: false,
  },
  {
    value: 'schema',
    label: 'Public Schema',
    icon: <GitCompare className="h-5 w-auto flex-none" />,
    disabled: false,
  },
  {
    value: 'supergraph',
    label: 'Supergraph',
    icon: <GitCompare className="h-5 w-auto flex-none" />,
    disabled: true,
  },
  {
    value: 'policy',
    label: 'Policy',
    icon: <AlertTriangle className="h-5 w-auto flex-none" />,
    disabled: true,
  },
];

const VERSION_VIEWS = [
  { value: 'details', label: 'Summary', icon: <List className="h-4 w-auto flex-none" /> },
  { value: 'full-schema', label: 'Schema', icon: <FileCode2 className="h-4 w-auto flex-none" /> },
  { value: 'supergraph', label: 'Supergraph', icon: <Layers className="h-4 w-auto flex-none" /> },
  { value: 'service-schema', label: 'Subgraphs', icon: <Box className="h-4 w-auto flex-none" /> },
];

const CONTRACTS = [
  { id: 'c1', name: 'public-api', status: 'changed' },
  { id: 'c2', name: 'partner-api', status: 'ok' },
  { id: 'c3', name: 'mobile', status: 'failed' },
];

function StatusIcon({ status }: { status: string }) {
  const [icon, label] =
    status === 'failed'
      ? [<AlertTriangle key="i" className="size-4 pl-1 text-yellow-500" />, 'Composition failed.']
      : status === 'changed'
        ? [<GitCompare key="i" className="size-4 pl-1" />, 'Schema changed']
        : [<Check key="i" className="size-4 pl-1" />, 'Composition succeeded.'];
  return <Tooltip trigger={<span className="inline-flex">{icon}</span>} content={label} />;
}

function ViewSwitchExamples() {
  const [checkView, setCheckView] = useState('details');
  const [contractView, setContractView] = useState('details');
  const [contract, setContract] = useState('default');
  const [versionContract, setVersionContract] = useState('default');
  const [versionView, setVersionView] = useState('details');
  const [service, setService] = useState('0');
  const [spanTab, setSpanTab] = useState('span-attributes');
  return (
    <div className="flex flex-col gap-10">
      <CallSiteGroup label="Checks page">
        <CallSite
          source="pages/target-checks-single.tsx:679"
          origin="ui"
          note="Boxed list: neutral fill, border-x and border-b, full width, left-aligned, no radius, so it sits on top of the bordered panel the page renders below. Icons, disabled items, and a data-testid per trigger for the e2e suite."
        >
          <Tabs value={checkView} onValueChange={setCheckView}>
            <TabsList className="bg-neutral-5 dark:bg-neutral-3 border-neutral-5 dark:border-neutral-3 w-full justify-start rounded-none border-x border-b">
              {CHECK_VIEWS.map(item => (
                <TabsTrigger key={item.value} value={item.value} disabled={item.disabled}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="dark:border-neutral-3 border-neutral-5 text-neutral-11 grow rounded-md rounded-t-none border border-t-0 p-4 text-sm">
            The {checkView} view renders here.
          </div>
        </CallSite>

        <CallSite
          source="pages/target-checks-single.tsx:1004"
          origin="ui"
          note="The contract check's views: the same box, and a disabled item explains itself through a tooltip wrapped around the trigger."
        >
          <Tabs value={contractView} onValueChange={setContractView}>
            <TabsList className="bg-neutral-3 border-neutral-3 w-full justify-start rounded-none border-x border-b">
              {[
                {
                  value: 'details',
                  label: 'Details',
                  icon: <List className="h-5 w-auto flex-none" />,
                  reason: null,
                },
                {
                  value: 'schema',
                  label: 'Public Schema',
                  icon: <GitCompare className="h-5 w-auto flex-none" />,
                  reason: null,
                },
                {
                  value: 'supergraph',
                  label: 'Supergraph',
                  icon: <GitCompare className="h-5 w-auto flex-none" />,
                  reason: 'Composition did not succeed. No Supergraph available.',
                },
              ].map(item => (
                <Tooltip
                  key={item.value}
                  trigger={
                    <span className="inline-flex">
                      <TabsTrigger value={item.value} disabled={!!item.reason}>
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </TabsTrigger>
                    </span>
                  }
                  content={item.reason}
                  disabled={!item.reason}
                  maxWidth="lg"
                  padding="lg"
                />
              ))}
            </TabsList>
          </Tabs>
        </CallSite>

        <CallSite
          source="pages/target-checks-single.tsx:1248"
          origin="ui"
          note="Default graph plus one tab per contract, drawn as file tabs: a transparent list, each trigger bordered with rounded-b-none so the active one joins the panel below, and a status icon under a tooltip on every tab."
        >
          <Tabs value={contract} onValueChange={setContract} className="mt-3">
            <TabsList className="w-full justify-start rounded-b-none bg-transparent px-2 py-0">
              <TabsTrigger
                value="default"
                className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
              >
                <span>Default Graph</span>
                <StatusIcon status="ok" />
              </TabsTrigger>
              {CONTRACTS.map(entry => (
                <TabsTrigger
                  key={entry.id}
                  value={entry.id}
                  className="mt-1 py-2 data-[state=active]:rounded-b-none"
                >
                  {entry.name}
                  <StatusIcon status={entry.status} />
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CallSite>
      </CallSiteGroup>

      <CallSiteGroup label="Schema version page">
        <CallSite
          source="pages/target-history-schema-version.tsx:315"
          origin="ui"
          note="The same file-tab contract picker, labels in mono at text-xs, every trigger bordered."
        >
          <Tabs value={versionContract} onValueChange={setVersionContract} className="mt-3">
            <TabsList className="w-full justify-start rounded-b-none bg-transparent px-2 py-0">
              <TabsTrigger
                value="default"
                className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
              >
                <span className="font-mono text-xs">Default Graph</span>
                <StatusIcon status="changed" />
              </TabsTrigger>
              {CONTRACTS.map(entry => (
                <TabsTrigger
                  key={entry.id}
                  value={entry.id}
                  className="data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2"
                >
                  <span className="font-mono text-xs">{entry.name}</span>
                  <StatusIcon status={entry.status} />
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CallSite>

        <CallSite
          source="pages/target-history-schema-version.tsx:380"
          origin="ui"
          note="Version views on the content variant with icons; the view renders below from state. Only shown for federated projects."
        >
          <Tabs value={versionView} onValueChange={setVersionView} className="mt-6">
            <TabsList variant="content">
              {VERSION_VIEWS.map(item => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  variant="content"
                  className="items-center-safe mx-3 inline-flex pb-2"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CallSite>
      </CallSiteGroup>

      <CallSiteGroup label="Editors">
        <CallSite
          source="target/proposals/editor.tsx:272"
          origin="ui"
          note="One tab per changed service in the proposal editor, on a scrollable list with its bottom padding removed. Triggers are asChild divs: bold name, a green dot and an editable name input for an unpublished service, a conflict popover, and a close X shown only on the active tab."
        >
          <Tabs value={service} onValueChange={setService}>
            <div className="mt-4 flex w-full flex-row pl-2">
              <TabsList className="no-scrollbar mr-auto max-w-full justify-normal overflow-x-auto whitespace-nowrap rounded-b-none p-2 pb-0 text-sm">
                {['accounts', 'reviews', ''].map((name, idx) => (
                  <TabsTrigger variant="default" value={`${idx}`} asChild key={idx}>
                    <div className="flex items-center p-2 font-bold">
                      {name ? (
                        name
                      ) : (
                        <>
                          <span className="-ml-2 mr-1 inline-block size-2 rounded-full bg-green-600" />
                          <input
                            className="min-w-[150px] border-none bg-transparent p-0 text-sm leading-none outline-none"
                            defaultValue="new-service"
                            aria-label="Service name"
                          />
                        </>
                      )}
                      <div className="ml-2">
                        <X className={cn('size-4', service !== `${idx}` && 'hidden')} />
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </CallSite>

        <CallSite
          source="pages/target-trace.tsx:233"
          origin="raw"
          note="Not ui/tabs at all: the span sheet's tab strip is hand-rolled buttons with a 2px bottom border and a Badge count each. Same job as the view switches above."
        >
          <div className="border-neutral-5 border-y">
            <div className="flex w-full gap-x-4 px-4 text-xs font-medium">
              {[
                { id: 'span-attributes', label: 'Span Attributes', count: 8 },
                { id: 'resource-attributes', label: 'Resource Attributes', count: 3 },
                { id: 'events', label: 'Events', count: 0 },
              ].map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    'border-b-2 p-2',
                    spanTab === entry.id
                      ? 'border-[#2662d8]'
                      : 'hover:border-neutral-5 border-transparent',
                  )}
                  onClick={() => setSpanTab(entry.id)}
                >
                  <span className="flex items-center gap-x-2">
                    {entry.label}
                    <span className="bg-neutral-5 text-neutral-11 rounded-sm px-1 text-[10px]">
                      {entry.count}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CallSite>
      </CallSiteGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A two-item toggle that switches the whole page.
// ---------------------------------------------------------------------------

export const SegmentedToggle = createPreview({
  label: 'Segmented toggle',
  render: () => <ToggleExample />,
});

function ToggleExample() {
  return (
    <CallSite
      source="pages/target-laboratory.tsx:460 and target-laboratory-new.tsx:800"
      origin="ui"
      note="Beside the Laboratory title: the default pill list shrunk to h-auto p-1 with px-2 py-0 triggers, no panels, and an accent dot marking the new laboratory. Switching it swaps the page below."
    >
      <div className="flex items-center gap-2">
        <span className="text-neutral-12 text-2xl font-semibold">Laboratory</span>
        <div className="bg-neutral-5 h-4 w-px" />
        <Tabs defaultValue="graphiql">
          <TabsList className="h-auto p-1">
            <TabsTrigger value="graphiql" className="px-2 py-0">
              GraphiQL
            </TabsTrigger>
            <TabsTrigger value="hive-laboratory" className="px-2 py-0">
              Hive Laboratory
              <div className="bg-accent ml-1 size-2 rounded-full" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </CallSite>
  );
}

// ---------------------------------------------------------------------------
// Every trigger size in use, side by side, so the base scale can be chosen against them.
// ---------------------------------------------------------------------------

export const SizesInUse = createPreview({
  label: 'Sizes in use',
  render: () => <SizeExamples />,
});

const SIZE_RECIPES: Array<{
  label: string;
  where: string;
  list: { variant?: 'default' | 'menu' | 'content'; className?: string };
  trigger: { variant?: 'default' | 'menu' | 'content'; className?: string };
}> = [
  {
    label: 'menu: px-4 py-3 text-sm',
    where: 'sub-navigation bar, proposal page sections',
    list: { variant: 'menu' },
    trigger: { variant: 'menu' },
  },
  {
    label: 'content: px-2 py-1 text-sm',
    where: 'CDN dialog, composition, SSO sheet, resource selector',
    list: { variant: 'content' },
    trigger: { variant: 'content' },
  },
  {
    label: 'content + mx-3 pb-2',
    where: 'schema version views',
    list: { variant: 'content' },
    trigger: { variant: 'content', className: 'items-center-safe mx-3 inline-flex pb-2' },
  },
  {
    label: 'default: px-3 py-1.5 text-sm in an h-10 p-1 list',
    where: 'checks page views, explorer filter',
    list: {},
    trigger: {},
  },
  {
    label: 'default + px-2 py-0 in an h-auto p-1 list',
    where: 'laboratory toggle',
    list: { className: 'h-auto p-1' },
    trigger: { className: 'px-2 py-0' },
  },
  {
    label: 'default + mt-1 py-2 border rounded-b-none',
    where: 'contract pickers on the checks and version pages',
    list: { className: 'w-full justify-start rounded-b-none bg-transparent px-2 py-0' },
    trigger: {
      className:
        'data-[state=active]:bg-neutral-5 dark:data-[state=active]:bg-neutral-3 border-neutral-5 dark:border-neutral-3 mt-1 rounded-b-none border py-2',
    },
  },
  {
    label: 'default, asChild div p-2 font-bold in a p-2 pb-0 list',
    where: 'proposal editor service tabs',
    list: { className: 'rounded-b-none p-2 pb-0 text-sm' },
    trigger: { className: 'p-2 font-bold' },
  },
];

function SizeExamples() {
  return (
    <div className="flex flex-col gap-8">
      {SIZE_RECIPES.map(recipe => (
        <CallSite key={recipe.label} source={recipe.where} origin="ui" note={recipe.label}>
          <Tabs defaultValue="details">
            <TabsList variant={recipe.list.variant} className={recipe.list.className}>
              <TabsTrigger
                value="details"
                variant={recipe.trigger.variant}
                className={recipe.trigger.className}
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="schema"
                variant={recipe.trigger.variant}
                className={recipe.trigger.className}
              >
                Public Schema
              </TabsTrigger>
              <TabsTrigger
                value="supergraph"
                variant={recipe.trigger.variant}
                className={recipe.trigger.className}
              >
                Supergraph
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CallSite>
      ))}
      <CallSite
        source="pages/target-trace.tsx:233"
        origin="raw"
        note="raw: p-2 text-xs font-medium with a 2px bottom border"
      >
        <div className="border-neutral-5 border-y">
          <div className="flex w-full gap-x-4 px-4 text-xs font-medium">
            {['Span Attributes', 'Resource Attributes', 'Events'].map((label, index) => (
              <button
                key={label}
                type="button"
                className={cn(
                  'border-b-2 p-2',
                  index === 0 ? 'border-[#2662d8]' : 'hover:border-neutral-5 border-transparent',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CallSite>
    </div>
  );
}
