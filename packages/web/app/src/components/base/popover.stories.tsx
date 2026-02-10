import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from './popover';

export default {
  title: 'Base / Popover',
} satisfies StoryDefault;

export const Default: Story = () => (
  <div className="flex items-center justify-center p-16">
    <Popover>
      <PopoverTrigger className="rounded-md border border-neutral-5 px-3 py-1.5 text-sm text-neutral-11">
        Open popover
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="bottom" sideOffset={4}>
          <PopoverPopup>
            <p className="text-sm text-neutral-11">This is a popover panel.</p>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  </div>
);

export const WithArrow: Story = () => (
  <div className="flex items-center justify-center p-16">
    <Popover>
      <PopoverTrigger className="rounded-md border border-neutral-5 px-3 py-1.5 text-sm text-neutral-11">
        With arrow
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="bottom" sideOffset={8}>
          <PopoverPopup>
            <PopoverArrow />
            <p className="text-sm text-neutral-11">Popover with an arrow indicator.</p>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  </div>
);

export const Sizes: Story = () => (
  <div className="flex items-center gap-4 p-16">
    {(['sm', 'md', 'lg'] as const).map(size => (
      <Popover key={size}>
        <PopoverTrigger className="rounded-md border border-neutral-5 px-3 py-1.5 text-sm text-neutral-11">
          Size: {size}
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner side="bottom" sideOffset={4}>
            <PopoverPopup size={size}>
              <p className="text-sm text-neutral-11">
                This is a <strong>{size}</strong> popover.
              </p>
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
    ))}
  </div>
);

export const Controlled: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-4 p-16">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="rounded-md border border-neutral-5 px-3 py-1.5 text-sm text-neutral-11">
          {open ? 'Close' : 'Open'}
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner side="bottom" sideOffset={4}>
            <PopoverPopup>
              <p className="text-sm text-neutral-11">Controlled popover.</p>
              <PopoverClose className="mt-2 rounded border border-neutral-5 px-2 py-1 text-xs text-neutral-11">
                Close
              </PopoverClose>
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
      <span className="text-xs text-neutral-8">State: {open ? 'open' : 'closed'}</span>
    </div>
  );
};

export const Placement: Story = () => (
  <div className="flex items-center justify-center gap-4 p-32">
    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
      <Popover key={side}>
        <PopoverTrigger className="rounded-md border border-neutral-5 px-3 py-1.5 text-sm text-neutral-11">
          {side}
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner side={side} sideOffset={4}>
            <PopoverPopup size="sm">
              <p className="text-sm text-neutral-11">Placed on {side}.</p>
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
    ))}
  </div>
);
