import { useState } from 'react';
import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Checkbox } from './checkbox';

export const nav: NavPath = 'Base/FormControls/Checkbox';

const TARGETS = ['production', 'staging', 'development'];

export const Sizes = createPreview(() => (
  <div className="flex items-center gap-4">
    <Checkbox size="sm" defaultChecked />
    <Checkbox size="md" defaultChecked />
  </div>
));

export const States = createPreview(() => (
  <div className="flex flex-col gap-3 text-[13px]">
    <label className="flex items-center gap-2">
      <Checkbox />
      Unchecked
    </label>
    <label className="flex items-center gap-2">
      <Checkbox defaultChecked />
      Checked
    </label>
    <label className="flex items-center gap-2">
      <Checkbox indeterminate />
      Indeterminate
    </label>
    <label className="flex items-center gap-2 opacity-100">
      <Checkbox disabled />
      Disabled
    </label>
    <label className="flex items-center gap-2">
      <Checkbox disabled defaultChecked />
      Disabled, checked
    </label>
  </div>
));

/** `visual` renders a non-interactive indicator: tabIndex -1, aria-hidden, default cursor. */
export const Visual = createPreview(() => (
  <div className="flex items-center gap-4">
    <Checkbox visual defaultChecked />
    <Checkbox visual />
  </div>
));

export const SelectAll = createPreview(() => {
  const [selected, setSelected] = useState<string[]>(['production']);
  const allChecked = selected.length === TARGETS.length;

  return (
    <div className="flex w-64 flex-col gap-3 text-[13px]">
      <label className="border-neutral-5 flex items-center gap-2 border-b pb-3 font-medium">
        <Checkbox
          checked={allChecked}
          indeterminate={selected.length > 0 && !allChecked}
          onCheckedChange={checked => setSelected(checked ? TARGETS : [])}
        />
        All targets
      </label>
      {TARGETS.map(target => (
        <label key={target} className="flex items-center gap-2">
          <Checkbox
            checked={selected.includes(target)}
            onCheckedChange={checked =>
              setSelected(prev =>
                checked ? [...prev, target] : prev.filter(item => item !== target),
              )
            }
          />
          {target}
        </label>
      ))}
    </div>
  );
});

export const Playground = createPreview({
  controls: defineControls({
    size: { type: 'radio', options: ['sm', 'md'], default: 'md' },
    checked: { type: 'boolean', default: true },
    indeterminate: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
  }),
  render: v => (
    <Checkbox
      size={v.size}
      checked={v.checked}
      indeterminate={v.indeterminate}
      disabled={v.disabled}
    />
  ),
});
