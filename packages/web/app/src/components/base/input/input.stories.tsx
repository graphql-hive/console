import type { Story, StoryDefault } from '@ladle/react';
import { Input } from './input';

export default {
  title: 'UI / Input',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="max-w-sm p-8">
    <Input placeholder="Some cool alert name" />
  </div>
);

export const Number: Story = () => (
  <div className="max-w-sm p-8">
    <Input type="number" placeholder="Enter a value" />
  </div>
);

export const Disabled: Story = () => (
  <div className="max-w-sm p-8">
    <Input placeholder="Disabled input" disabled />
  </div>
);

export const WithValue: Story = () => (
  <div className="max-w-sm p-8">
    <Input defaultValue="P99 Latency Spike" />
  </div>
);
