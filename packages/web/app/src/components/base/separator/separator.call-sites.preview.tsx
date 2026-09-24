import { useState } from 'react';
import { MoveDownIcon, SearchIcon } from 'lucide-react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '@/components/base/button/button';
import { Input } from '@/components/base/input/input';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Select } from '../floating/select/select';
import { Separator } from './separator';

export const nav: NavPath = 'Base/Primitives/Separator/Component Examples';

/**
 * Every Separator in the app: one toolbar, on two pages. Transcribed with the real search input,
 * sort Select and direction button around it, since the divider only makes sense between them.
 *
 * History: both were `ui/separator` (Radix) carrying `mx-4 h-8` until round 4. The base one has
 * no margin, so the row moved from `gap-x-2` to `gap-x-4`. The third importer, the sidebar's own
 * separator wrapper, went with the sidebar.
 */

const ENTRIES = [
  {
    source: 'pages/organization.tsx:224',
    origin: 'base',
    what: 'Between search and sort above the projects list',
    coveredBy: 'List toolbar',
  },
  {
    source: 'pages/project.tsx:237',
    origin: 'base',
    what: 'Between search and sort above the targets list',
    coveredBy: 'List toolbar',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/separator"
      summary={
        <>
          Two sites, the same toolbar on the organization and project pages. Both vertical, at a
          control&apos;s height. No horizontal Separator is in use yet.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

const SORT_OPTIONS = [
  {
    value: 'requests',
    label: 'Requests',
    description: 'GraphQL requests made in the last 7 days.',
  },
  {
    value: 'versions',
    label: 'Schema Versions',
    description: 'Schemas published in last 7 days.',
  },
  { value: 'name', label: 'Name', description: 'Sort by project name.' },
];

function ListToolbar() {
  const [sortBy, setSortBy] = useState('requests');
  return (
    <div className="flex flex-row items-center gap-x-4">
      <div className="w-full md:w-[200px] lg:w-[336px]">
        <Input type="search" placeholder="Search..." leadingIcon={SearchIcon} />
      </div>
      <Separator orientation="vertical" />
      <Select options={SORT_OPTIONS} value={sortBy} onValueChange={setSortBy} />
      <Button variant="outline" layout="iconOnly" icon={MoveDownIcon} aria-label="Sort ascending" />
    </div>
  );
}

export const ListToolbarPreview = createPreview({
  label: 'List toolbar',
  render: () => (
    <CallSite
      source="pages/organization.tsx:224 and pages/project.tsx:237"
      origin="base"
      note="Search, divider, sort, direction. The row's gap-x-4 is the only spacing the divider gets."
    >
      <ListToolbar />
    </CallSite>
  ),
});
