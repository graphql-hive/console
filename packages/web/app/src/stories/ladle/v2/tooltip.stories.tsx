import type { Story } from '@ladle/react';
import { Tooltip } from '@/components/v2/tooltip';
import { Button } from '@/components/ui/button';

export default {
  title: 'V2 / Tooltip',
};

export const Default: Story = () => (
  <div className="flex items-center justify-center p-12">
    <Tooltip content="This is a tooltip">
      <Button>Hover me</Button>
    </Tooltip>
  </div>
);

export const LongContent: Story = () => (
  <div className="flex items-center justify-center p-12">
    <Tooltip content="This is a longer tooltip message that provides more detailed information about the element you're hovering over.">
      <Button>Hover for more info</Button>
    </Tooltip>
  </div>
);

export const Sides: Story = () => (
  <div className="flex items-center justify-center gap-4 p-24">
    <Tooltip content="Top tooltip" contentProps={{ side: 'top' }}>
      <Button variant="outline">Top</Button>
    </Tooltip>
    <Tooltip content="Right tooltip" contentProps={{ side: 'right' }}>
      <Button variant="outline">Right</Button>
    </Tooltip>
    <Tooltip content="Bottom tooltip" contentProps={{ side: 'bottom' }}>
      <Button variant="outline">Bottom</Button>
    </Tooltip>
    <Tooltip content="Left tooltip" contentProps={{ side: 'left' }}>
      <Button variant="outline">Left</Button>
    </Tooltip>
  </div>
);

export const OnIcon: Story = () => (
  <div className="flex items-center justify-center p-12">
    <Tooltip content="Help information">
      <button className="text-neutral-11 hover:text-neutral-12 cursor-help">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="10" cy="10" r="8" />
          <path d="M10 14v.01M10 6v4" />
        </svg>
      </button>
    </Tooltip>
  </div>
);

export const MultipleTooltips: Story = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 p-12">
    <Tooltip content="Save your work">
      <Button size="sm">Save</Button>
    </Tooltip>
    <Tooltip content="Cancel changes">
      <Button size="sm" variant="outline">
        Cancel
      </Button>
    </Tooltip>
    <Tooltip content="Delete permanently">
      <Button size="sm" variant="destructive">
        Delete
      </Button>
    </Tooltip>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Tooltip Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Tooltip wrapper with custom styling and animations. Provides contextual information
        on hover with smooth fade-in animations.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Background Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-5 rounded-lg p-4 text-xs">Tooltip</div>
          <code className="text-xs">bg-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Tooltip background</span>
        </div>
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <polygon points="10,0 0,10 20,10" className="text-neutral-1 fill-current" />
          </svg>
          <code className="text-xs">text-neutral-1 fill-current</code>
          <span className="text-neutral-11 text-xs">- Arrow color</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-5 text-neutral-12 rounded-lg p-2 text-xs">Content</div>
          <code className="text-xs">text-neutral-12</code>
          <span className="text-neutral-11 text-xs">- Tooltip text</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Animations</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[side=top]:animate-slide-down-fade</code>
          <span className="text-neutral-11 text-xs">- Top side animation</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[side=right]:animate-slide-left-fade</code>
          <span className="text-neutral-11 text-xs">- Right side animation</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[side=bottom]:animate-slide-up-fade</code>
          <span className="text-neutral-11 text-xs">- Bottom side animation</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[side=left]:animate-slide-right-fade</code>
          <span className="text-neutral-11 text-xs">- Left side animation</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-lg p-4</code>
          <span className="text-neutral-11 text-xs">- Border radius and padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-xs font-normal</code>
          <span className="text-neutral-11 text-xs">- Typography</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">shadow-sm</code>
          <span className="text-neutral-11 text-xs">- Subtle shadow</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">sideOffset={'{4}'}</code>
          <span className="text-neutral-11 text-xs">- Distance from trigger (4px)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Portal Behavior</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            Tooltip content is portaled based on ModalTooltipContext:
          </p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>If context provides container, renders in that container via Portal</li>
            <li>Otherwise renders directly in place</li>
            <li>Allows tooltips to escape modal z-index stacking</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="flex flex-wrap items-center gap-4 p-4">
        <Tooltip content="Icon tooltip">
          <button className="text-neutral-11 hover:text-neutral-12">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="10" r="8" />
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="Button tooltip">
          <Button size="sm">Action</Button>
        </Tooltip>
        <Tooltip content="This is a long explanation that provides detailed information">
          <span className="text-neutral-11 cursor-help text-sm underline decoration-dotted">
            Help text
          </span>
        </Tooltip>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Tooltip primitives (Provider, Root, Trigger, Content, Arrow, Portal)</li>
        <li>Wraps children in Trigger with asChild prop for polymorphism</li>
        <li>Content and contentProps allow customization of tooltip positioning and style</li>
        <li>Each Tooltip has its own Provider for independent control</li>
        <li>ModalTooltipContext used for portal container in modals</li>
        <li>Animation classes use data attributes for direction-specific entrance</li>
        <li>Object.assign pattern adds Provider as static property</li>
      </ul>
    </div>
  </div>
);
