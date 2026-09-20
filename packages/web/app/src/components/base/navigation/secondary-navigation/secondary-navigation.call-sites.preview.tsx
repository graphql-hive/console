import { GraphQLIcon } from '@/components/ui/brand-icon';
import { ChartPieIcon, FileDiffIcon, LinkIcon, ListIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { SecondaryNavigation as SecondaryNavigationBar } from '@/components/navigation/secondary-navigation';
import { Button } from '@/components/base/button/button';
import { SecondaryNavigation, type SecondaryNavigationItem } from './secondary-navigation';

export const nav: NavPath = 'Base/Navigation/SecondaryNavigation/Component Examples';

/**
 * Every SecondaryNavigation mount, drawn with its real labels and the chrome around it. The
 * layouts gate items on permissions and run the layout query, so the items are listed as a
 * viewer with every permission sees them. The foundry router resolves the routes, so the links
 * are real.
 *
 * History: until round 7 all three were `ui/tabs` with router links inside `TabsTrigger asChild`,
 * so each rendered `role="tab"` on anchors that changed the URL.
 */

const ENTRIES = [
  {
    source: 'components/navigation/secondary-navigation.tsx:22',
    origin: 'base',
    what: 'The bar under the organization, project and target headers, mounted by the three layouts',
    coveredBy: 'Bars',
  },
  {
    source: 'pages/target-proposal.tsx:564',
    origin: 'base',
    what: 'The sections of one proposal, with icons, at sm',
    coveredBy: 'Proposal sections',
  },
  {
    source: 'components/target/explorer/filter.tsx:66',
    origin: 'base',
    what: 'All, Unused and Deprecated as three routes, a pill with a tooltip per link',
    coveredBy: 'Explorer filter',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/navigation/secondary-navigation"
      summary={
        <>
          Five mounts in three shapes: the three layout bars through the app composite, the proposal
          page sections, and the explorer's type filter as a pill.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

const ORGANIZATION = { organizationSlug: 'the-guild' };
const PROJECT = { ...ORGANIZATION, projectSlug: 'gateway' };
const TARGET = { ...PROJECT, targetSlug: 'production' };

const ORGANIZATION_LINKS: SecondaryNavigationItem[] = [
  { value: 'overview', label: 'Overview', to: '/$organizationSlug', params: ORGANIZATION },
  { value: 'members', label: 'Members', to: '/$organizationSlug', params: ORGANIZATION },
  { value: 'settings', label: 'Settings', to: '/$organizationSlug', params: ORGANIZATION },
  { value: 'support', label: 'Support', to: '/$organizationSlug', params: ORGANIZATION },
  { value: 'subscription', label: 'Subscription', to: '/$organizationSlug', params: ORGANIZATION },
];

const PROJECT_LINKS: SecondaryNavigationItem[] = [
  { value: 'targets', label: 'Targets', to: '/$organizationSlug/$projectSlug', params: PROJECT },
  { value: 'alerts', label: 'Alerts', to: '/$organizationSlug/$projectSlug', params: PROJECT },
  { value: 'settings', label: 'Settings', to: '/$organizationSlug/$projectSlug', params: PROJECT },
];

const TARGET_LINKS: SecondaryNavigationItem[] = [
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
].map(label => ({
  value: label.toLowerCase(),
  label,
  to: '/$organizationSlug/$projectSlug/$targetSlug',
  params: TARGET,
}));

export const Bars = createPreview({
  label: 'Bars',
  render: () => (
    <div className="-mx-6 flex flex-col gap-8">
      <CallSite
        source="components/layouts/organization.tsx:123"
        origin="base"
        note="Members, Settings, Support and Subscription are each gated on a permission; the action is gated on creating projects."
      >
        <SecondaryNavigationBar
          page="members"
          links={ORGANIZATION_LINKS}
          actions={
            <Button variant="link">
              <span className="flex items-center">
                <PlusIcon size={16} className="mr-2" />
                New project
              </span>
            </Button>
          }
        />
      </CallSite>
      <CallSite
        source="components/layouts/project.tsx:115"
        origin="base"
        note="Alerts and Settings gated; the action is gated on creating targets."
      >
        <SecondaryNavigationBar
          page="targets"
          links={PROJECT_LINKS}
          actions={
            <Button variant="link">
              <span className="flex items-center">
                <PlusIcon size={16} className="mr-2" />
                New target
              </span>
            </Button>
          }
        />
      </CallSite>
      <CallSite
        source="components/layouts/target.tsx:144"
        origin="base"
        note="Eleven pages, six of them gated. Connect to CDN shows when the CDN is enabled and hides below md."
      >
        <SecondaryNavigationBar
          page="checks"
          links={TARGET_LINKS}
          actions={
            <div className="hidden md:block">
              <Button variant="link">
                <span className="flex items-center whitespace-nowrap">
                  <LinkIcon size={16} className="mr-2" />
                  Connect to CDN
                </span>
              </Button>
            </div>
          }
        />
      </CallSite>
      <CallSite
        source="the same, while the layout query is in flight"
        origin="base"
        note="Placeholders hold the bar's height until the organization, project and target resolve."
      >
        <SecondaryNavigationBar loading links={[]} />
      </CallSite>
    </div>
  ),
});

const PROPOSAL_SECTIONS: SecondaryNavigationItem[] = [
  { value: 'details', label: 'Details', icon: ListIcon },
  { value: 'schema', label: 'Schema', icon: FileDiffIcon },
  { value: 'supergraph', label: 'Supergraph Preview', icon: GraphQLIcon },
  { value: 'checks', label: 'Checks', icon: ChartPieIcon },
  { value: 'edit', label: 'Edit', icon: PencilIcon },
].map(item => ({ ...item, to: '/$organizationSlug/$projectSlug/$targetSlug', params: TARGET }));

export const ProposalSections = createPreview({
  label: 'Proposal sections',
  render: () => (
    <CallSite
      source="pages/target-proposal.tsx:564"
      origin="base"
      note="Each section is the same route with a different page search param; Supergraph Preview only on a distributed graph. The page draws the 1px row line under it."
    >
      <div className="border-neutral-5 border-b">
        <SecondaryNavigation
          aria-label="Proposal"
          value="schema"
          items={PROPOSAL_SECTIONS}
          size="sm"
        />
      </div>
    </CallSite>
  ),
});

export const ExplorerFilter = createPreview({
  label: 'Explorer filter',
  render: () => (
    <CallSite
      source="components/target/explorer/filter.tsx:66"
      origin="base"
      note="Beside the Explore Schema heading. The links carry the current search so the period and filters survive the switch."
    >
      <SecondaryNavigation
        aria-label="Type filter"
        variant="pill"
        size="sm"
        value="unused"
        items={[
          {
            value: 'all',
            label: 'All',
            tooltip: 'Shows all types, including unused and deprecated ones',
            to: '/$organizationSlug/$projectSlug/$targetSlug',
            params: TARGET,
          },
          {
            value: 'unused',
            label: 'Unused',
            tooltip: 'Shows only types that are not used in any operation',
            to: '/$organizationSlug/$projectSlug/$targetSlug',
            params: TARGET,
          },
          {
            value: 'deprecated',
            label: 'Deprecated',
            tooltip: 'Shows only types that are marked as deprecated',
            to: '/$organizationSlug/$projectSlug/$targetSlug',
            params: TARGET,
          },
        ]}
      />
    </CallSite>
  ),
});
