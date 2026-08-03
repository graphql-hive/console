import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { RadioGroup, RadioItem } from './radio-group';

export default {
  title: 'UI / Radio Group',
} satisfies StoryDefault;

export const Severity: Story = () => {
  const [value, setValue] = useState('WARNING');

  return (
    <div className="p-8">
      <RadioGroup value={value} onValueChange={setValue}>
        <RadioItem
          value="INFO"
          label="Info"
          indicator={<span className="size-2 rounded-full bg-blue-400" />}
        />
        <RadioItem
          value="WARNING"
          label="Warning"
          indicator={<span className="size-2 rounded-full bg-yellow-400" />}
        />
        <RadioItem
          value="CRITICAL"
          label="Critical"
          indicator={<span className="size-2 rounded-full bg-red-400" />}
        />
      </RadioGroup>
      <p className="text-neutral-10 mt-4 text-sm">Selected: {value}</p>
    </div>
  );
};

export const Plain: Story = () => {
  const [value, setValue] = useState('ABOVE');

  return (
    <div className="p-8">
      <RadioGroup value={value} onValueChange={setValue}>
        <RadioItem value="ABOVE" label="Above" />
        <RadioItem value="BELOW" label="Below" />
      </RadioGroup>
      <p className="text-neutral-10 mt-4 text-sm">Selected: {value}</p>
    </div>
  );
};
