import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Input',
};

export const Default: Story = () => <Input placeholder="Enter text..." />;

export const WithValue: Story = () => <Input value="Example value" readOnly />;

export const Disabled: Story = () => <Input placeholder="Disabled input" disabled />;

export const WithTypes: Story = () => (
  <div className="w-[300px] space-y-4">
    <Input type="text" placeholder="Text input" />
    <Input type="email" placeholder="Email input" />
    <Input type="password" placeholder="Password input" />
    <Input type="number" placeholder="Number input" />
    <Input type="url" placeholder="URL input" />
    <Input type="search" placeholder="Search input" />
  </div>
);

export const WithLabels: Story = () => (
  <div className="w-[300px] space-y-4">
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Username</label>
      <Input placeholder="Enter username" />
    </div>
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Email</label>
      <Input type="email" placeholder="Enter email" />
    </div>
    <div className="space-y-2">
      <label className="text-neutral-12 text-sm font-medium">Password</label>
      <Input type="password" placeholder="Enter password" />
    </div>
  </div>
);

export const Interactive: Story = () => {
  const [value, setValue] = useState('');

  return (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <label className="text-neutral-12 text-sm font-medium">Try typing</label>
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Type something..."
        />
        <p className="text-neutral-11 text-xs">
          Value: <span className="text-neutral-12">{value || '(empty)'}</span>
        </p>
      </div>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-2xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Input States</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">
            Default state (border-neutral-5)
          </label>
          <Input placeholder="Default input" />
        </div>

        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">
            With value (text-neutral-12)
          </label>
          <Input value="Filled input value" readOnly />
        </div>

        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">
            Placeholder (text-neutral-9)
          </label>
          <Input placeholder="Placeholder text color" />
        </div>

        <div className="space-y-2">
          <label className="text-neutral-11 text-sm font-medium">Disabled (opacity-50)</label>
          <Input placeholder="Disabled input" disabled />
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Focus States</h2>
      <p className="text-neutral-11 mb-4 text-sm">
        Click on inputs below to see the focus ring (ring-offset-2)
      </p>
      <div className="space-y-3">
        <Input placeholder="Focus me to see the ring" />
        <Input placeholder="Focus ring uses ring color" />
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Complete Form Example</h2>
      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">Project Name</label>
          <Input placeholder="My GraphQL Project" />
          <p className="text-neutral-10 text-xs">This will be the display name for your project</p>
        </div>

        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">GraphQL Endpoint</label>
          <Input type="url" placeholder="https://api.example.com/graphql" />
        </div>

        <div className="space-y-2">
          <label className="text-neutral-12 text-sm font-medium">API Key</label>
          <Input type="password" placeholder="••••••••••••" />
        </div>
      </form>
    </div>
  </div>
);
