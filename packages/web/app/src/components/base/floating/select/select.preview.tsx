import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Button } from '../../button/button';
import { Select, type SelectOption } from './select';

export const nav: NavPath = 'Base/Floating/Select';

const METRICS: SelectOption[] = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'LATENCY:p99', label: 'p99 latency' },
  { value: 'LATENCY:p95', label: 'p95 latency' },
];

const CLIENTS: SelectOption[] = [
  'Hive CLI',
  'hive-gateway',
  'graphql-yoga',
  'apollo-rover',
  'graphql-mesh',
  'cosmo-router',
  'federation-gateway',
  'stellate-edge',
  'grafbase-cli',
  'envelop-plugin',
].map(name => ({ value: name, label: name }));

const STATUS_DOT = 'size-2 rounded-full';

export const Default = createPreview(() => {
  const [value, setValue] = useState('TRAFFIC');
  return <Select options={METRICS} value={value} onValueChange={setValue} />;
});

export const Placeholder = createPreview(() => {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <Select options={METRICS} value={value} onValueChange={setValue} placeholder="Choose metric…" />
  );
});

/** `searchable` adds a filter input and a fixed-height scroll area to the popup. */
export const Searchable = createPreview(() => {
  const [value, setValue] = useState('Hive CLI');
  return <Select options={CLIENTS} value={value} onValueChange={setValue} searchable />;
});

export const WithIcons = createPreview(() => {
  const [value, setValue] = useState('healthy');
  return (
    <Select
      options={[
        {
          value: 'healthy',
          label: 'Healthy',
          icon: <span className={`bg-success ${STATUS_DOT}`} />,
        },
        {
          value: 'degraded',
          label: 'Degraded',
          icon: <span className={`bg-warning ${STATUS_DOT}`} />,
        },
        { value: 'down', label: 'Down', icon: <span className={`bg-critical ${STATUS_DOT}`} /> },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
});

export const CustomTrigger = createPreview(() => {
  const [value, setValue] = useState('TRAFFIC');
  return (
    <Select
      options={METRICS}
      value={value}
      onValueChange={setValue}
      trigger={
        <Button label={METRICS.find(o => o.value === value)?.label ?? 'Pick…'} variant="action" />
      }
    />
  );
});

export const Disabled = createPreview(() => <Select options={METRICS} value="TRAFFIC" disabled />);
