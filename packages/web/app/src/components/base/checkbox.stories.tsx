import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import type { Story, StoryDefault } from '@ladle/react';
import { Checkbox, CheckboxIndicator } from './checkbox';

export default {
  title: 'Base / Checkbox',
} satisfies StoryDefault;

export const Default: Story = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3 p-8">
      <Checkbox checked={checked} onCheckedChange={setChecked}>
        <CheckboxIndicator>
          <Check className="size-3" strokeWidth={3} />
        </CheckboxIndicator>
      </Checkbox>
      <span className="text-sm text-neutral-11">
        {checked ? 'Checked' : 'Unchecked'}
      </span>
    </div>
  );
};

export const Sizes: Story = () => {
  const [values, setValues] = useState({ sm: false, md: true, lg: false });
  return (
    <div className="flex items-center gap-6 p-8">
      {(['sm', 'md', 'lg'] as const).map(size => (
        <div key={size} className="flex items-center gap-2">
          <Checkbox
            size={size}
            checked={values[size]}
            onCheckedChange={v => setValues(prev => ({ ...prev, [size]: v }))}
          >
            <CheckboxIndicator>
              <Check className={size === 'lg' ? 'size-4' : 'size-3'} strokeWidth={3} />
            </CheckboxIndicator>
          </Checkbox>
          <span className="text-sm text-neutral-11">{size}</span>
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
        <Checkbox
          checked={allChecked}
          indeterminate={indeterminate}
          onCheckedChange={toggleAll}
        >
          <CheckboxIndicator>
            {indeterminate ? (
              <Minus className="size-3" strokeWidth={3} />
            ) : (
              <Check className="size-3" strokeWidth={3} />
            )}
          </CheckboxIndicator>
        </Checkbox>
        <span className="text-sm font-medium text-neutral-11">Select all</span>
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
            >
              <CheckboxIndicator>
                <Check className="size-3" strokeWidth={3} />
              </CheckboxIndicator>
            </Checkbox>
            <span className="text-sm text-neutral-11">Item {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Disabled: Story = () => (
  <div className="flex items-center gap-6 p-8">
    <div className="flex items-center gap-2">
      <Checkbox disabled checked={false}>
        <CheckboxIndicator>
          <Check className="size-3" strokeWidth={3} />
        </CheckboxIndicator>
      </Checkbox>
      <span className="text-sm text-neutral-8">Disabled unchecked</span>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox disabled checked>
        <CheckboxIndicator>
          <Check className="size-3" strokeWidth={3} />
        </CheckboxIndicator>
      </Checkbox>
      <span className="text-sm text-neutral-8">Disabled checked</span>
    </div>
  </div>
);
