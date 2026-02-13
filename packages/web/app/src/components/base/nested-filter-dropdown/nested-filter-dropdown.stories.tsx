import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { MenuRoot } from '@/components/base/menu';
import { cn } from '@/lib/utils';
import { NestedFilterDropdown, type NestedFilterDropdownProps } from './nested-filter-dropdown';
import type { FilterItem, FilterSelection } from './types';
import { ValuesSubPanel } from './values-sub-panel';

export default {
  title: 'UI / NestedFilterDropdown',
} satisfies StoryDefault;

function StoryWrapper(
  props: Omit<NestedFilterDropdownProps, 'value' | 'onChange' | 'onRemove'> & {
    initialValue?: FilterSelection[];
  },
) {
  const { initialValue = [], ...rest } = props;
  const [value, setValue] = useState<FilterSelection[]>(initialValue);
  return (
    <div className="p-8">
      <NestedFilterDropdown
        value={value}
        onChange={setValue}
        onRemove={() => setValue([])}
        {...rest}
      />
      <pre className="text-neutral-9 mt-4 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

const mockClients: FilterItem[] = [
  { name: 'Hive CLI', values: ['0.12.0', '0.12.1', '0.12.2', '0.12.3', '0.12.4', '0.12.5'] },
  { name: 'Hive Client', values: ['1.0.0', '1.0.1', '1.1.0'] },
  { name: 'unknown', values: [] },
  { name: 'hive-app', values: ['2.0.0', '2.1.0'] },
  { name: 'hive-public-api', values: ['1.0.0'] },
  { name: 'hive-client-yoga', values: ['3.0.0', '3.1.0', '3.2.0'] },
  { name: 'hive-gateway', values: ['0.1.0', '0.2.0', '0.3.0', '1.0.0'] },
  { name: 'hive-go-cli', values: ['0.5.0', '0.6.0'] },
];

export const Default: Story = () => (
  <StoryWrapper label="Client" items={mockClients} valuesLabel="versions" />
);

export const WithSelections: Story = () => (
  <StoryWrapper
    label="Client"
    items={mockClients}
    valuesLabel="versions"
    initialValue={[
      { name: 'Hive CLI', values: ['0.12.1', '0.12.3'] },
      { name: 'hive-gateway', values: null },
    ]}
  />
);

export const CustomLabel: Story = () => (
  <StoryWrapper
    label="Region"
    items={[
      { name: 'US East', values: ['us-east-1', 'us-east-2'] },
      { name: 'US West', values: ['us-west-1', 'us-west-2'] },
      { name: 'EU', values: ['eu-west-1', 'eu-central-1', 'eu-north-1'] },
      { name: 'Asia Pacific', values: ['ap-southeast-1', 'ap-northeast-1'] },
      { name: 'Global', values: [] },
    ]}
    valuesLabel="zones"
  />
);

export const SubPanel: Story = () => {
  const [selectedValues, setSelectedValues] = useState<string[] | null>(null);
  const values = ['0.12.0', '0.12.1', '0.12.2', '0.12.3', '0.12.4', '0.12.5'];

  return (
    <div className="p-8">
      <MenuRoot open modal={false}>
        <div
          className={cn(
            'w-56 rounded-md border p-2 shadow-md',
            'bg-neutral-1 border-neutral-4 dark:bg-neutral-4 dark:border-neutral-5',
          )}
        >
          <ValuesSubPanel
            itemName="Hive CLI"
            values={values}
            selectedValues={selectedValues}
            onValuesChange={setSelectedValues}
            valuesLabel="versions"
          />
        </div>
      </MenuRoot>
      <pre className="text-neutral-9 mt-4 text-xs">
        {JSON.stringify(selectedValues, null, 2)}
      </pre>
    </div>
  );
};
