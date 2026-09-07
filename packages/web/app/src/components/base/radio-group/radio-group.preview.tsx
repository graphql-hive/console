import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { RadioGroup } from './radio-group';

export const nav: NavPath = 'Base/FormControls/RadioGroup';

export const Default = createPreview(() => {
  const [value, setValue] = useState('7d');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: '1h', label: 'Last hour' },
        { value: '1d', label: 'Last day' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
      ]}
    />
  );
});

/** `indicator` renders before the label, e.g. a status dot. */
export const WithIndicators = createPreview(() => {
  const [value, setValue] = useState('all');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'all', label: 'All' },
        {
          value: 'breaking',
          label: 'Breaking',
          indicator: <span className="bg-critical size-2 rounded-full" />,
        },
        {
          value: 'dangerous',
          label: 'Dangerous',
          indicator: <span className="bg-warning size-2 rounded-full" />,
        },
        {
          value: 'safe',
          label: 'Safe',
          indicator: <span className="bg-success size-2 rounded-full" />,
        },
      ]}
    />
  );
});

export const TwoOptions = createPreview(() => {
  const [value, setValue] = useState('federation');

  return (
    <RadioGroup
      variant="as-button"
      value={value}
      onValueChange={setValue}
      items={[
        { value: 'federation', label: 'Federation' },
        { value: 'single', label: 'Single schema' },
      ]}
    />
  );
});

const SEVERITY_ITEMS = [
  {
    value: 'normal',
    label: 'Normal',
    description:
      'Minor problems or general questions with little to no impact on functionality, often involving small nuisances or easily bypassed errors.',
  },
  {
    value: 'high',
    label: 'High',
    description:
      'Significant problems affecting a subset of users or workflows, with a workaround available.',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Critical failures blocking production traffic with no available workaround.',
  },
];

/** `as-card` stacks full-width options with a real radio dot and supporting copy. */
export const AsCard = createPreview(() => {
  const [value, setValue] = useState('normal');

  return (
    <div className="w-[493px]">
      <RadioGroup
        variant="as-card"
        onSurface="base"
        value={value}
        onValueChange={setValue}
        items={SEVERITY_ITEMS}
      />
    </div>
  );
});

/** `orientation` is independent of `variant`: cards side by side, buttons stacked. */
export const Orientations = createPreview(() => {
  const [cards, setCards] = useState('normal');
  const [buttons, setButtons] = useState('7d');

  return (
    <div className="flex flex-col gap-8">
      <div className="w-[760px]">
        <RadioGroup
          variant="as-card"
          orientation="vertical"
          value={cards}
          onValueChange={setCards}
          items={SEVERITY_ITEMS}
        />
      </div>
      <RadioGroup
        variant="as-button"
        orientation="horizontal"
        value={buttons}
        onValueChange={setButtons}
        items={[
          { value: '1h', label: 'Last hour' },
          { value: '1d', label: 'Last day' },
          { value: '7d', label: 'Last 7 days' },
        ]}
      />
    </div>
  );
});

/** The same cards on a floating surface (popover, dialog), which sits a step lighter. */
export const AsCardFloating = createPreview(() => {
  const [value, setValue] = useState('high');

  return (
    <div className="bg-neutral-3 w-[533px] rounded-md p-5">
      <RadioGroup
        variant="as-card"
        onSurface="floating"
        value={value}
        onValueChange={setValue}
        items={SEVERITY_ITEMS}
      />
    </div>
  );
});
