import { ChartPieIcon, FileDiffIcon, ListIcon, PencilIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { GraphQLIcon } from '@/components/ui/brand-icon';
import { SecondaryNavigation, type SecondaryNavigationItem } from './secondary-navigation';

export const nav: NavPath = 'Base/Navigation/SecondaryNavigation/Component Examples';

/**
 * The old value-driven nav at two of its former mounts, for comparison with `Navigation` until
 * this component is deleted.
 *
 * History: until round 7 all three were `ui/tabs` with router links inside `TabsTrigger asChild`,
 * so each rendered `role="tab"` on anchors that changed the URL.
 */

const ENTRIES = [
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
          Superseded by base/navigation/navigation, which every mount now uses; kept for comparison
          until it is deleted. These two stories show the old value-driven shapes.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

const ORGANIZATION = { organizationSlug: 'the-guild' };
const PROJECT = { ...ORGANIZATION, projectSlug: 'gateway' };
const TARGET = { ...PROJECT, targetSlug: 'production' };

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
