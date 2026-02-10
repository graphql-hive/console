import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import {
  NestedFilterDropdown,
  type FilterItem,
  type FilterSelection,
} from './nested-filter-dropdown';

export default {
  title: 'UI / NestedFilterDropdown',
} satisfies StoryDefault;

const mockClients: FilterItem[] = [
  {
    name: 'Hive CLI',
    values: ['0.12.0', '0.12.1', '0.12.2', '0.12.3', '0.12.4', '0.12.5'],
  },
  {
    name: 'Hive Client',
    values: ['1.0.0', '1.0.1', '1.1.0'],
  },
  { name: 'unknown', values: [] },
  {
    name: 'hive-app',
    values: ['2.0.0', '2.1.0'],
  },
  { name: 'hive-public-api', values: ['1.0.0'] },
  { name: 'hive-client-yoga', values: ['3.0.0', '3.1.0', '3.2.0'] },
  {
    name: 'hive-gateway',
    values: ['0.1.0', '0.2.0', '0.3.0', '1.0.0'],
  },
  { name: 'hive-go-cli', values: ['0.5.0', '0.6.0'] },
];

export const Default: Story = () => {
  const [value, setValue] = useState<FilterSelection[]>([]);
  return (
    <div className="p-8">
      <NestedFilterDropdown
        label="Client"
        items={mockClients}
        value={value}
        onChange={setValue}
        onRemove={() => setValue([])}
        valuesLabel="versions"
      />
      <pre className="text-neutral-9 mt-4 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
};

export const WithSelections: Story = () => {
  const [value, setValue] = useState<FilterSelection[]>([
    { name: 'Hive CLI', values: ['0.12.1', '0.12.3'] },
    { name: 'hive-gateway', values: null },
  ]);
  return (
    <div className="p-8">
      <NestedFilterDropdown
        label="Client"
        items={mockClients}
        value={value}
        onChange={setValue}
        onRemove={() => setValue([])}
        valuesLabel="versions"
      />
      <pre className="text-neutral-9 mt-4 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
};

const mockRegions: FilterItem[] = [
  { name: 'US East', values: ['us-east-1', 'us-east-2'] },
  { name: 'US West', values: ['us-west-1', 'us-west-2'] },
  { name: 'EU', values: ['eu-west-1', 'eu-central-1', 'eu-north-1'] },
  { name: 'Asia Pacific', values: ['ap-southeast-1', 'ap-northeast-1'] },
  { name: 'Global', values: [] },
];

export const CustomLabel: Story = () => {
  const [value, setValue] = useState<FilterSelection[]>([]);
  return (
    <div className="p-8">
      <NestedFilterDropdown
        label="Region"
        items={mockRegions}
        value={value}
        onChange={setValue}
        onRemove={() => setValue([])}
        valuesLabel="zones"
      />
      <pre className="text-neutral-9 mt-4 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
};
