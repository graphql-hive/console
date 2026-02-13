import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import { Checkbox } from './checkbox';

export default {
  title: 'Base / Checkbox',
} satisfies StoryDefault;

export const Default: Story = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3 p-8">
      <Checkbox checked={checked} onCheckedChange={setChecked} />
      <span className="text-neutral-11 text-sm">{checked ? 'Checked' : 'Unchecked'}</span>
    </div>
  );
};

export const Sizes: Story = () => {
  const [values, setValues] = useState({ sm: false, md: true });
  return (
    <div className="flex items-center gap-6 p-8">
      {(['sm', 'md'] as const).map(size => (
        <div key={size} className="flex items-center gap-2">
          <Checkbox
            checked={values[size]}
            onCheckedChange={v => setValues(prev => ({ ...prev, [size]: v }))}
            size={size}
          />
          <span className="text-neutral-11 text-sm">{size}</span>
        </div>
      ))}
    </div>
  );
};

export const Indeterminate: Story = () => {
  const [items, setItems] = useState([true, false, true]);

  const allChecked = items.every(Boolean);
  const noneChecked = items.every(v => !v);
  const indeterminate = !allChecked && !noneChecked;

  const toggleAll = () => {
    if (allChecked || indeterminate) {
      setItems([false, false, false]);
    } else {
      setItems([true, true, true]);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-8">
      <div className="flex items-center gap-2">
        <Checkbox checked={allChecked} indeterminate={indeterminate} onCheckedChange={toggleAll} />
        <span className="text-neutral-11 text-sm font-medium">Select all</span>
      </div>
      <div className="ml-4 flex flex-col gap-2">
        {items.map((checked, i) => (
          <div key={i} className="flex items-center gap-2">
            <Checkbox
              size="sm"
              checked={checked}
              onCheckedChange={v =>
                setItems(prev => prev.map((item, idx) => (idx === i ? !!v : item)))
              }
            />
            <span className="text-neutral-11 text-sm">Item {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Disabled: Story = () => (
  <div className="flex items-center gap-6 p-8">
    <div className="flex items-center gap-2">
      <Checkbox disabled checked={false} />
      <span className="text-neutral-8 text-sm">Disabled unchecked</span>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox disabled checked />
      <span className="text-neutral-8 text-sm">Disabled checked</span>
    </div>
  </div>
);
