import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Textarea',
};

export const Default: Story = () => <Textarea placeholder="Type your message here..." />;

export const WithLabel: Story = () => (
  <div className="flex max-w-md flex-col gap-2">
    <Label htmlFor="message">Your message</Label>
    <Textarea id="message" placeholder="Type your message here..." />
  </div>
);

export const WithValue: Story = () => (
  <Textarea
    defaultValue="This textarea has some default content that demonstrates what text looks like inside the component."
    className="max-w-md"
  />
);

export const Disabled: Story = () => (
  <Textarea
    disabled
    placeholder="This textarea is disabled"
    defaultValue="Disabled content"
    className="max-w-md"
  />
);

export const AutoSize: Story = () => (
  <div className="flex max-w-md flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Label htmlFor="auto">Auto-sizing Textarea</Label>
      <Textarea id="auto" autoSize placeholder="This textarea automatically grows as you type..." />
      <p className="text-neutral-11 text-xs">Try typing multiple lines</p>
    </div>
  </div>
);

export const CustomHeight: Story = () => (
  <div className="flex max-w-md flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Label>Small (80px)</Label>
      <Textarea placeholder="min-h-[80px] (default)" />
    </div>
    <div className="flex flex-col gap-2">
      <Label>Medium (120px)</Label>
      <Textarea placeholder="min-h-[120px]" className="min-h-[120px]" />
    </div>
    <div className="flex flex-col gap-2">
      <Label>Large (200px)</Label>
      <Textarea placeholder="min-h-[200px]" className="min-h-[200px]" />
    </div>
  </div>
);

export const Interactive: Story = () => {
  const [value, setValue] = React.useState('');

  return (
    <div className="max-w-md space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="interactive">Interactive textarea</Label>
        <Textarea
          id="interactive"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Start typing..."
        />
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-neutral-11">
          Characters: <span className="font-mono">{value.length}</span>
        </p>
        <p className="text-neutral-11">
          Lines: <span className="font-mono">{value.split('\n').length}</span>
        </p>
      </div>
    </div>
  );
};

export const WithErrorState: Story = () => (
  <div className="flex max-w-md flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Label htmlFor="error" className="text-red-500">
        Message (required)
      </Label>
      <Textarea
        id="error"
        placeholder="Enter your message..."
        className="border-red-500 focus-visible:ring-red-500"
      />
      <p className="text-xs text-red-500">This field is required</p>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Textarea States</h2>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default</p>
          <Textarea placeholder="Type here..." />
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-neutral-3</code>
            <br />
            Border: <code className="text-neutral-12">border-neutral-5</code>
            <br />
            Placeholder: <code className="text-neutral-12">text-neutral-10</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Content</p>
          <Textarea defaultValue="This textarea contains some text content that demonstrates the text color and styling." />
          <p className="text-neutral-10 text-xs">
            Text: <code className="text-neutral-12">text-neutral-12 (inherited)</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Disabled</p>
          <Textarea disabled placeholder="Disabled textarea" defaultValue="Disabled content" />
          <p className="text-neutral-10 text-xs">
            Opacity: <code className="text-neutral-12">opacity-50</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Focus States</h2>
      <p className="text-neutral-11 mb-4 text-sm">
        Click or tab into the textarea to see the focus ring
      </p>
      <Textarea placeholder="Focus me to see the focus ring..." />
      <p className="text-neutral-10 mt-2 text-xs">
        Focus ring: <code className="text-neutral-12">ring-ring</code> with{' '}
        <code className="text-neutral-12">ring-offset-neutral-2</code>
      </p>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Size Variants</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Small (Default 80px)</p>
          <Textarea placeholder="min-h-[80px]" />
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Large (200px)</p>
          <Textarea placeholder="min-h-[200px]" className="min-h-[200px]" />
        </div>
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Auto-sizing</p>
          <Textarea autoSize placeholder="Grows automatically with content..." />
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">With Labels</h2>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="labeled">Description</Label>
          <Textarea id="labeled" placeholder="Enter a description..." />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="labeled-with-help">Feedback</Label>
          <Textarea id="labeled-with-help" placeholder="Share your feedback..." />
          <p className="text-neutral-11 text-xs">Your feedback helps us improve the product</p>
        </div>
      </div>
    </div>
  </div>
);
