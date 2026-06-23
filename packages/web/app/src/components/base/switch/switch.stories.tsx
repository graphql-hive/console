import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { Switch } from './switch';

export default {
  title: 'Base / Switch',
} satisfies StoryDefault;

export const Default: Story = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3 p-8">
      <Switch checked={checked} onCheckedChange={setChecked} />
      <span className="text-neutral-11 text-sm">{checked ? 'On' : 'Off'}</span>
    </div>
  );
};

export const Sizes: Story = () => {
  const [values, setValues] = useState({ small: false, standard: true });
  return (
    <div className="flex items-center gap-6 p-8">
      {(['small', 'standard'] as const).map(size => (
        <div key={size} className="flex items-center gap-2">
          <Switch
            size={size}
            checked={values[size]}
            onCheckedChange={v => setValues(prev => ({ ...prev, [size]: v }))}
          />
          <span className="text-neutral-11 text-sm">{size}</span>
        </div>
      ))}
    </div>
  );
};

export const Disabled: Story = () => (
  <div className="flex items-center gap-6 p-8">
    <div className="flex items-center gap-2">
      <Switch disabled checked={false} />
      <span className="text-neutral-8 text-sm">Disabled off</span>
    </div>
    <div className="flex items-center gap-2">
      <Switch disabled checked />
      <span className="text-neutral-8 text-sm">Disabled on</span>
    </div>
  </div>
);
