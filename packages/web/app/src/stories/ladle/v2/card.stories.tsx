import { Card } from '@/components/v2/card';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Card',
};

export const Default: Story = () => (
  <Card>
    <div className="text-sm">This is a card component</div>
  </Card>
);

export const WithContent: Story = () => (
  <Card className="max-w-md">
    <h3 className="text-neutral-12 mb-2 text-lg font-semibold">Card Title</h3>
    <p className="text-neutral-11 mb-4 text-sm">
      This is a simple card component that provides a bordered container with padding.
    </p>
    <button className="bg-neutral-2 text-neutral-12 rounded-sm px-4 py-2 text-sm">Action</button>
  </Card>
);

export const MultipleCards: Story = () => (
  <div className="grid grid-cols-3 gap-4">
    <Card>
      <div className="text-neutral-12 mb-2 text-sm font-medium">Card 1</div>
      <div className="text-neutral-10 text-xs">First card content</div>
    </Card>
    <Card>
      <div className="text-neutral-12 mb-2 text-sm font-medium">Card 2</div>
      <div className="text-neutral-10 text-xs">Second card content</div>
    </Card>
    <Card>
      <div className="text-neutral-12 mb-2 text-sm font-medium">Card 3</div>
      <div className="text-neutral-10 text-xs">Third card content</div>
    </Card>
  </div>
);

export const AsChild: Story = () => (
  <Card asChild>
    <a href="#" className="hover:bg-neutral-3 block transition-colors">
      <div className="text-neutral-12 mb-2 text-sm font-medium">Clickable Card</div>
      <div className="text-neutral-10 text-xs">This card is rendered as a link element</div>
    </a>
  </Card>
);

export const CustomStyling: Story = () => (
  <div className="space-y-4">
    <Card className="bg-neutral-3">
      <div className="text-sm">Card with custom background</div>
    </Card>
    <Card className="border-neutral-2 border-2">
      <div className="text-sm">Card with accent border</div>
    </Card>
    <Card className="p-8">
      <div className="text-sm">Card with larger padding</div>
    </Card>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Card Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Simple card container component with optional asChild prop for polymorphic rendering.
        Provides consistent border and padding for content sections.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Card className="w-32 p-2">
            <div className="text-xs">Default</div>
          </Card>
          <code className="text-xs">border-neutral-5</code>
          <span className="text-neutral-11 text-xs">- Default border</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-md</code>
          <span className="text-neutral-11 text-xs">- Border radius</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">border</code>
          <span className="text-neutral-11 text-xs">- 1px solid border</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">p-5</code>
          <span className="text-neutral-11 text-xs">- Default padding (20px)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">asChild Behavior</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            When <code className="text-neutral-12">asChild=true</code>, uses Radix Slot to merge
            props with child element:
          </p>
          <Card asChild className="inline-block">
            <button className="cursor-pointer">Button as Card</button>
          </Card>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            This allows rendering Card styles on any element while preserving semantics
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Content container:</p>
          <Card className="max-w-sm">
            <h4 className="text-neutral-12 mb-2 font-medium">Section Title</h4>
            <p className="text-neutral-10 text-xs">Content goes here</p>
          </Card>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Grid layout:</p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs">Item 1</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs">Item 2</div>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses forwardRef for ref forwarding</li>
        <li>Radix Slot component for asChild polymorphism</li>
        <li>Default renders as div element</li>
        <li>All HTMLDivElement props supported</li>
        <li>Custom className merged with default styles using cn() utility</li>
        <li>Display name set to "Card" for debugging</li>
      </ul>
    </div>
  </div>
);
