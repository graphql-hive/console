import { useState } from 'react';
import { Flex } from '@/components/base/story-utils';
import type { Story, StoryDefault } from '@ladle/react';
import { Popover } from './popover';

export default {
  title: 'Base / Popover',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="flex items-center justify-center p-16">
    <Popover
      trigger={
        <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
          Open popover
        </button>
      }
      content={<p className="text-neutral-11 text-sm">This is a popover panel.</p>}
    />
  </div>
);

export const WithArrow: Story = () => (
  <Flex>
    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
      <Popover
        key={side}
        trigger={
          <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
            {side}
          </button>
        }
        content={<p className="text-neutral-11 text-sm">Arrow on {side}.</p>}
        side={side}
        arrow
      />
    ))}
  </Flex>
);

export const Controlled: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-4 p-16">
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
            {open ? 'Close' : 'Open'}
          </button>
        }
        content={
          <div>
            <p className="text-neutral-11 text-sm">Controlled popover.</p>
            <button
              onClick={() => setOpen(false)}
              className="border-neutral-5 text-neutral-11 mt-2 rounded-sm border px-2 py-1 text-xs"
            >
              Close
            </button>
          </div>
        }
      />
      <span className="text-neutral-8 text-xs">State: {open ? 'open' : 'closed'}</span>
    </div>
  );
};

export const Placement: Story = () => (
  <div className="flex items-center justify-center gap-4 p-32">
    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
      <Popover
        key={side}
        trigger={
          <button className="border-neutral-5 text-neutral-11 rounded-md border px-3 py-1.5 text-sm">
            {side}
          </button>
        }
        content={<p className="text-neutral-11 text-sm">Placed on {side}.</p>}
        side={side}
      />
    ))}
  </div>
);
