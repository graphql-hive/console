import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { Select } from './select';
import { Flex } from '../../story-utils';

export default {
  title: 'UI / Select',
} satisfies StoryDefault;

const metricOptions = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'p75', label: 'p75 latency' },
  { value: 'p90', label: 'p90 latency' },
  { value: 'p95', label: 'p95 latency' },
  { value: 'p99', label: 'p99 latency' },
];

const rangeOptions = [
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1h' },
  { value: '360', label: '6h' },
  { value: '1440', label: '1d' },
  { value: '10080', label: '7d' },
  { value: '20160', label: '14d' },
];

export const Default: Story = () => {
  const [value, setValue] = useState('TRAFFIC');

  return (
    <Flex>
      <Select
        options={metricOptions}
        value={value}
        onValueChange={setValue}
        placeholder="Select metric"
      />
    </Flex>
  );
};

export const CompactRange: Story = () => {
  const [value, setValue] = useState('10080');

  return (
    <Flex>
      <Select
        options={rangeOptions}
        value={value}
        onValueChange={setValue}
        placeholder="Range"
      />
    </Flex>
  );
};

export const MultipleSelects: Story = () => {
  const [metric, setMetric] = useState('TRAFFIC');
  const [range, setRange] = useState('10080');

  return (
    <Flex>
      <div className="flex items-center gap-3">
        <div>
          <div className="text-neutral-11 mb-1 text-xs font-medium uppercase tracking-wider">
            Metric
          </div>
          <Select options={metricOptions} value={metric} onValueChange={setMetric} />
        </div>
        <div>
          <div className="text-neutral-11 mb-1 text-xs font-medium uppercase tracking-wider">
            Range
          </div>
          <Select options={rangeOptions} value={range} onValueChange={setRange} />
        </div>
      </div>
    </Flex>
  );
};

export const NoSelection: Story = () => (
  <Flex>
    <Select options={metricOptions} placeholder="Choose a metric…" />
  </Flex>
);

export const Disabled: Story = () => (
  <Flex>
    <Select options={metricOptions} value="TRAFFIC" disabled />
  </Flex>
);

const manyOptions = [
  { value: '', label: 'No filter (all operations)' },
  ...Array.from({ length: 20 }, (_, i) => ({
    value: `filter-${i + 1}`,
    label: `Saved filter ${i + 1}`,
  })),
];

export const Searchable: Story = () => {
  const [value, setValue] = useState('');

  return (
    <Flex>
      <Select
        options={manyOptions}
        value={value}
        onValueChange={setValue}
        placeholder="Select a filter"
        searchable
      />
    </Flex>
  );
};
