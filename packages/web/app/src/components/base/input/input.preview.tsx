import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { Input } from './input';

export const nav: NavPath = 'Base/Input';

export const Default = createPreview(() => <Input placeholder="Enter alert name" />);

export const Types = createPreview(() => (
  <div className="flex w-72 flex-col gap-3">
    <Input placeholder="Text" />
    <Input type="number" placeholder="Threshold" />
    <Input type="email" placeholder="you@example.com" />
    <Input type="password" placeholder="Token" />
  </div>
));

export const States = createPreview(() => (
  <div className="flex w-72 flex-col gap-3">
    <Input placeholder="Empty" />
    <Input defaultValue="P99 Latency Spike" />
    <Input placeholder="Disabled" disabled />
    <Input defaultValue="Disabled with value" disabled />
    <Input defaultValue="Read only" readOnly />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    placeholder: { type: 'text', default: 'Enter alert name' },
    value: { type: 'text', default: '' },
    type: { type: 'select', options: ['text', 'number', 'email', 'password'], default: 'text' },
    disabled: { type: 'boolean', default: false },
  }),
  render: v => (
    <Input
      // Remount on value change so the control drives an uncontrolled input.
      key={v.value}
      type={v.type}
      placeholder={v.placeholder}
      defaultValue={v.value}
      disabled={v.disabled}
    />
  ),
});
