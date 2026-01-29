import type { Story } from '@ladle/react';
import { Separator } from '@/components/ui/separator';

export const Horizontal: Story = () => (
  <div className="space-y-4 max-w-md">
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
  <nav className="flex items-center space-x-4 max-w-md">
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
  <div className="max-w-sm rounded-lg border border-neutral-6 bg-neutral-1">
    <div className="p-4">
      <h3 className="text-neutral-12 font-semibold">Card Title</h3>
      <p className="text-neutral-11 text-sm mt-1">Card description goes here</p>
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
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Separator Component</h2>
      <p className="text-neutral-11 mb-4">
        Visually or semantically separates content. Built with Radix UI Separator.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Horizontal Separator</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm">Content above</p>
            <Separator className="my-4" />
            <p className="text-neutral-11 text-sm">Content below</p>
          </div>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-border</code>
            <br />
            Height: <code className="text-neutral-12">h-[1px]</code>
            <br />
            Width: <code className="text-neutral-12">w-full</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical Separator</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="flex h-16 items-center">
              <p className="text-neutral-11 text-sm px-4">Left</p>
              <Separator orientation="vertical" />
              <p className="text-neutral-11 text-sm px-4">Right</p>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Background: <code className="text-neutral-12">bg-border</code>
            <br />
            Width: <code className="text-neutral-12">w-[1px]</code>
            <br />
            Height: <code className="text-neutral-12">h-full</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Height (Vertical)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="flex items-center gap-4">
              <span className="text-neutral-11 text-sm">Item 1</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-neutral-11 text-sm">Item 2</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-neutral-11 text-sm">Item 3</span>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Use <code className="text-neutral-12">className="h-4"</code> to control height
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
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
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Content Sections</p>
          <p className="text-neutral-10 text-xs">
            Separate distinct sections of content within cards, modals, or page layouts.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Navigation</p>
          <p className="text-neutral-10 text-xs">
            Vertical separators between navigation items in horizontal menus or breadcrumbs.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">List Items</p>
          <p className="text-neutral-10 text-xs">
            Horizontal separators between items in lists, menus, or settings panels.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Accessibility</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-neutral-11 text-sm mb-2">
          When <code className="text-neutral-12">decorative={true}</code> (default):
        </p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>No ARIA role applied</li>
          <li>Not announced by screen readers</li>
          <li>Purely visual separation</li>
        </ul>
        <p className="text-neutral-11 text-sm mt-4 mb-2">
          When <code className="text-neutral-12">decorative={false}</code>:
        </p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>ARIA role="separator" applied</li>
          <li>Semantic separation for assistive technologies</li>
        </ul>
      </div>
    </div>
  </div>
);
