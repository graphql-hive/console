import { Separator } from '@/components/ui/separator';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Separator',
};

export const Horizontal: Story = () => (
  <div className="max-w-md space-y-4">
    <div>
      <h3 className="text-neutral-12 font-medium">Section 1</h3>
      <p className="text-neutral-11 text-sm">Content above the separator.</p>
    </div>
    <Separator />
    <div>
      <h3 className="text-neutral-12 font-medium">Section 2</h3>
      <p className="text-neutral-11 text-sm">Content below the separator.</p>
    </div>
  </div>
);

export const Vertical: Story = () => (
  <div className="flex h-20 items-center">
    <div className="px-4">
      <p className="text-neutral-11 text-sm">Left section</p>
    </div>
    <Separator orientation="vertical" />
    <div className="px-4">
      <p className="text-neutral-11 text-sm">Middle section</p>
    </div>
    <Separator orientation="vertical" />
    <div className="px-4">
      <p className="text-neutral-11 text-sm">Right section</p>
    </div>
  </div>
);

export const InList: Story = () => (
  <div className="max-w-md space-y-1">
    <div className="p-3">
      <p className="text-neutral-12 font-medium">Item 1</p>
      <p className="text-neutral-11 text-sm">Description of item 1</p>
    </div>
    <Separator />
    <div className="p-3">
      <p className="text-neutral-12 font-medium">Item 2</p>
      <p className="text-neutral-11 text-sm">Description of item 2</p>
    </div>
    <Separator />
    <div className="p-3">
      <p className="text-neutral-12 font-medium">Item 3</p>
      <p className="text-neutral-11 text-sm">Description of item 3</p>
    </div>
  </div>
);

export const InNav: Story = () => (
  <nav className="flex max-w-md items-center space-x-4">
    <a href="#" className="text-neutral-11 hover:text-neutral-12 text-sm">
      Home
    </a>
    <Separator orientation="vertical" className="h-4" />
    <a href="#" className="text-neutral-11 hover:text-neutral-12 text-sm">
      About
    </a>
    <Separator orientation="vertical" className="h-4" />
    <a href="#" className="text-neutral-11 hover:text-neutral-12 text-sm">
      Contact
    </a>
  </nav>
);

export const InCard: Story = () => (
  <div className="border-neutral-6 bg-neutral-1 max-w-sm rounded-lg border">
    <div className="p-4">
      <h3 className="text-neutral-12 font-semibold">Card Title</h3>
      <p className="text-neutral-11 mt-1 text-sm">Card description goes here</p>
    </div>
    <Separator />
    <div className="p-4">
      <p className="text-neutral-11 text-sm">Additional card content</p>
    </div>
    <Separator />
    <div className="p-4">
      <button className="text-accent text-sm hover:underline">Card Action</button>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Separator Component</h2>
      <p className="text-neutral-11 mb-4">
        Visually or semantically separates content. Built with Radix UI Separator.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Horizontal Separator</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <p className="text-neutral-11 text-sm">Content above</p>
            <Separator className="my-4" />
            <p className="text-neutral-11 text-sm">Content below</p>
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-border</code>
            <br />
            Height: <code className="text-neutral-12">h-[1px]</code>
            <br />
            Width: <code className="text-neutral-12">w-full</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical Separator</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="flex h-16 items-center">
              <p className="text-neutral-11 px-4 text-sm">Left</p>
              <Separator orientation="vertical" />
              <p className="text-neutral-11 px-4 text-sm">Right</p>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Background: <code className="text-neutral-12">bg-border</code>
            <br />
            Width: <code className="text-neutral-12">w-[1px]</code>
            <br />
            Height: <code className="text-neutral-12">h-full</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Height (Vertical)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <div className="flex items-center gap-4">
              <span className="text-neutral-11 text-sm">Item 1</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-neutral-11 text-sm">Item 2</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-neutral-11 text-sm">Item 3</span>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Use <code className="text-neutral-12">className="h-4"</code> to control height
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">orientation</code>: "horizontal" (default) |
            "vertical"
          </li>
          <li>
            <code className="text-neutral-12">decorative</code>: true (default) - purely visual, no
            ARIA role
          </li>
          <li>
            <code className="text-neutral-12">className</code>: Custom styles (colors, spacing,
            etc.)
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Content Sections</p>
          <p className="text-neutral-10 text-xs">
            Separate distinct sections of content within cards, modals, or page layouts.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Navigation</p>
          <p className="text-neutral-10 text-xs">
            Vertical separators between navigation items in horizontal menus or breadcrumbs.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">List Items</p>
          <p className="text-neutral-10 text-xs">
            Horizontal separators between items in lists, menus, or settings panels.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Accessibility</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-11 mb-2 text-sm">
          When <code className="text-neutral-12">decorative={true}</code> (default):
        </p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>No ARIA role applied</li>
          <li>Not announced by screen readers</li>
          <li>Purely visual separation</li>
        </ul>
        <p className="text-neutral-11 mb-2 mt-4 text-sm">
          When <code className="text-neutral-12">decorative={false}</code>:
        </p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>ARIA role="separator" applied</li>
          <li>Semantic separation for assistive technologies</li>
        </ul>
      </div>
    </div>
  </div>
);
