import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { RadioGroup, RadioItem } from './radio-group';

export const nav: NavPath = 'Base/FormControls/RadioGroup';

export const Default = createPreview(() => {
  const [value, setValue] = useState('7d');

  return (
    <RadioGroup value={value} onValueChange={setValue}>
      <RadioItem value="1h" label="Last hour" />
      <RadioItem value="1d" label="Last day" />
      <RadioItem value="7d" label="Last 7 days" />
      <RadioItem value="30d" label="Last 30 days" />
    </RadioGroup>
  );
});

/** `indicator` renders before the label, e.g. a status dot. */
export const WithIndicators = createPreview(() => {
  const [value, setValue] = useState('all');

  return (
    <RadioGroup value={value} onValueChange={setValue}>
      <RadioItem value="all" label="All" />
      <RadioItem
        value="breaking"
        label="Breaking"
        indicator={<span className="bg-critical size-2 rounded-full" />}
      />
      <RadioItem
        value="dangerous"
        label="Dangerous"
        indicator={<span className="bg-warning size-2 rounded-full" />}
      />
      <RadioItem
        value="safe"
        label="Safe"
        indicator={<span className="bg-success size-2 rounded-full" />}
      />
    </RadioGroup>
  );
});

export const TwoOptions = createPreview(() => {
  const [value, setValue] = useState('federation');

  return (
    <RadioGroup value={value} onValueChange={setValue}>
      <RadioItem value="federation" label="Federation" />
      <RadioItem value="single" label="Single schema" />
    </RadioGroup>
  );
});
