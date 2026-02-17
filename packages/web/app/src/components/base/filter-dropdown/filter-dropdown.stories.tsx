import { useState } from 'react';
import { InsightsFilters } from '@/components/base/insights-filters';
import { MenuRoot } from '@/components/base/menu/menu';
import { cn } from '@/lib/utils';
import type { Story, StoryDefault } from '@ladle/react';
import { FilterDropdown, type FilterDropdownProps } from './filter-dropdown';
import type { FilterItem, FilterSelection } from './types';
import { ValuesSubPanel } from './values-sub-panel';

export default {
  title: 'UI / FilterDropdown',
} satisfies StoryDefault;

function StoryWrapper({
  items,
  label,
  value: initialValue,
  valuesLabel,
}: Omit<FilterDropdownProps, 'onChange' | 'onRemove'>) {
  const [value, setValue] = useState<FilterSelection[]>(initialValue);
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-neutral-8 mb-2 text-xs font-medium uppercase tracking-wider">
          Active filters
        </div>
        {value.length === 0 ? (
          <div className="text-neutral-8 text-sm">No filters active</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {value.map(selection => (
              <li key={selection.name} className="text-neutral-11">
                <span className="text-neutral-12 font-medium">{selection.name}</span>
                {' — '}
                {selection.values === null ? (
                  <span className="text-neutral-8 italic">all {valuesLabel}</span>
                ) : (
                  <span className="text-neutral-9">{selection.values.join(', ')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <FilterDropdown
        items={items}
        label={label}
        onChange={setValue}
        onRemove={() => setValue([])}
        value={value}
        valuesLabel={valuesLabel}
      />
    </div>
  );
}

const mockClients: FilterItem[] = [
  {
    name: 'Hive CLI',
    values: [
      '0.12.0',
      '0.12.1',
      '0.12.2',
      '0.12.3',
      '0.12.4',
      '0.12.5',
      '0.12.6',
      '0.12.7',
      '0.12.8',
      '0.12.9',
      '0.12.10',
      '0.12.11',
      '0.12.12',
      '0.12.13',
      '0.12.14',
      '0.12.15',
      '0.12.16',
      '0.12.17',
    ],
  },
  { name: 'Hive Client', values: ['1.0.0', '1.0.1', '1.1.0'] },
  { name: 'unknown', values: [] },
  { name: 'hive-app', values: ['2.0.0', '2.1.0'] },
  { name: 'hive-public-api', values: ['1.0.0'] },
  { name: 'hive-client-yoga', values: ['3.0.0', '3.1.0', '3.2.0'] },
  { name: 'hive-gateway', values: ['0.1.0', '0.2.0', '0.3.0', '1.0.0'] },
  { name: 'hive-go-cli', values: ['0.5.0', '0.6.0'] },
  { name: 'hive-rust-sdk', values: ['0.1.0', '0.2.0'] },
  { name: 'apollo-rover', values: ['0.23.0', '0.24.0', '0.25.0'] },
  { name: 'graphql-mesh', values: ['1.0.0', '1.1.0', '1.2.0', '1.3.0'] },
  { name: 'federation-gateway', values: ['2.0.0', '2.1.0'] },
  { name: 'stellate-edge', values: ['0.9.0', '0.10.0'] },
  { name: 'grafbase-cli', values: ['0.4.0', '0.5.0', '0.6.0'] },
  { name: 'cosmo-router', values: ['0.1.0', '0.2.0', '0.3.0'] },
  { name: 'graphql-yoga', values: ['5.0.0', '5.1.0', '5.2.0', '5.3.0'] },
  { name: 'envelop-plugin', values: ['4.0.0', '4.1.0'] },
  { name: 'graphql-codegen', values: ['5.0.0', '5.1.0', '5.2.0'] },
  { name: 'hive-python-sdk', values: ['0.3.0', '0.4.0'] },
  { name: 'hive-dotnet-sdk', values: ['0.1.0'] },
  { name: 'schema-registry-action', values: ['1.0.0', '1.1.0', '1.2.0'] },
];

export const Default: Story = () => (
  <StoryWrapper label="Client" items={mockClients} value={[]} valuesLabel="versions" />
);

export const WithSelections: Story = () => (
  <StoryWrapper
    label="Client"
    items={mockClients}
    valuesLabel="versions"
    value={[
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
    value={[]}
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
      <pre className="text-neutral-9 mt-4 text-xs">{JSON.stringify(selectedValues, null, 2)}</pre>
    </div>
  );
};

const mockOperations: FilterItem[] = [
  { name: 'GetUser', values: [] },
  { name: 'ListProducts', values: [] },
  { name: 'CreateOrder', values: [] },
  { name: 'UpdateCart', values: [] },
  { name: 'DeleteItem', values: [] },
  { name: 'SearchInventory', values: [] },
  { name: 'GetRecommendations', values: [] },
  { name: 'ProcessPayment', values: [] },
];

export const InsightsFiltersDropdown: Story = () => {
  const [clientSelections, setClientSelections] = useState<FilterSelection[]>([]);
  const [operationSelections, setOperationSelections] = useState<FilterSelection[]>([]);

  const allSelections = [
    ...operationSelections.map(s => ({ ...s, category: 'Operation' })),
    ...clientSelections.map(s => ({ ...s, category: 'Client' })),
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="text-neutral-8 mb-2 text-xs font-medium uppercase tracking-wider">
          Active filters
        </div>
        {allSelections.length === 0 ? (
          <div className="text-neutral-8 text-sm">No filters active</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {allSelections.map(selection => (
              <li key={`${selection.category}:${selection.name}`} className="text-neutral-11">
                <span className="text-neutral-9">{selection.category}:</span>{' '}
                <span className="text-neutral-12 font-medium">{selection.name}</span>
                {selection.values !== null && selection.values.length > 0 && (
                  <>
                    {' — '}
                    <span className="text-neutral-9">{selection.values.join(', ')}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <InsightsFilters
        clientFilterItems={mockClients}
        clientFilterSelections={clientSelections}
        operationFilterItems={mockOperations}
        operationFilterSelections={operationSelections}
        setClientSelections={setClientSelections}
        setOperationSelections={setOperationSelections}
        privateViews={[
          {
            id: '1',
            name: 'My production filter',
            filters: { operationHashes: [], clientFilters: [], dateRange: null },
          },
        ]}
        sharedViews={[]}
        onApplyView={() => {}}
      />
    </div>
  );
};
