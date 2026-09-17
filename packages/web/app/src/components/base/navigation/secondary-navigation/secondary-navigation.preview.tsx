import { GitCompare, Layers, List, Pencil, PieChart } from 'lucide-react';
import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { SecondaryNavigation as SecondaryNavigationBar } from '@/components/navigation/secondary-navigation';
import { Button } from '../../button/button';
import { SecondaryNavigation, type SecondaryNavigationItem } from './secondary-navigation';

export const nav: NavPath = 'Base/Navigation/SecondaryNavigation';

/**
 * Links between the pages of one area. A `<nav>` of router links with `aria-current` on the
 * current one; each item is a `Link`'s props plus a value and label. Mounted by the
 * sub-navigation bar (through the app composite in `navigation/secondary-navigation`), the
 * proposal page sections and the explorer filter. The foundry router resolves the app's routes,
 * so the links here are real.
 */

const TARGET = {
  organizationSlug: 'the-guild',
  projectSlug: 'gateway',
  targetSlug: 'production',
};

const TARGET_PAGES = [
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

const TARGET_ITEMS: SecondaryNavigationItem[] = TARGET_PAGES.map(label => ({
  value: label.toLowerCase(),
  label,
  to: '/$organizationSlug/$projectSlug/$targetSlug',
  params: TARGET,
}));

const PROPOSAL_ITEMS: SecondaryNavigationItem[] = [
  { value: 'details', label: 'Details', icon: List },
  { value: 'schema', label: 'Schema', icon: GitCompare },
  { value: 'supergraph', label: 'Supergraph Preview', icon: Layers },
  { value: 'checks', label: 'Checks', icon: PieChart },
  { value: 'edit', label: 'Edit', icon: Pencil },
].map(item => ({ ...item, to: '/$organizationSlug/$projectSlug/$targetSlug', params: TARGET }));

/** The bar under every org, project and target header: the app composite, with the layout's action at its edge. */
export const Bar = createPreview(() => (
  <div className="-mx-6">
    <SecondaryNavigationBar
      page="checks"
      links={TARGET_ITEMS}
      actions={<Button variant="ghost">Connect to CDN</Button>}
    />
  </div>
));

/** While the layout still loads the org, project and target, placeholders hold the height. */
export const Loading = createPreview(() => <SecondaryNavigation items={TARGET_ITEMS} loading />);

/** Sections of one page, with icons: the proposal page. */
export const WithIcons = createPreview(() => (
  <SecondaryNavigation aria-label="Proposal" value="schema" items={PROPOSAL_ITEMS} size="sm" />
));

/** Three routes as a pill, each explained on hover: the explorer's All, Unused and Deprecated. */
export const Pill = createPreview(() => (
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
));

/** An item a permission hides is left out, as the layouts do for pages a viewer cannot see. */
export const Gated = createPreview(() => (
  <SecondaryNavigation
    aria-label="Target"
    value="schema"
    items={TARGET_ITEMS.map(item => ({ ...item, visible: item.value !== 'settings' }))}
  />
));

export const Playground = createPreview({
  controls: controlsFor(SecondaryNavigation, {
    variant: { type: 'radio', options: ['underline', 'pill'], default: 'underline' },
    size: { type: 'radio', options: ['default', 'sm'], default: 'default' },
    loading: { type: 'boolean', default: false },
  }),
  render: v => (
    <SecondaryNavigation
      aria-label="Proposal"
      value="schema"
      items={PROPOSAL_ITEMS}
      variant={v.variant}
      size={v.size}
      loading={v.loading}
    />
  ),
});
