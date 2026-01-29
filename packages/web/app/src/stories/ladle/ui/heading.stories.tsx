import type { Story } from '@ladle/react';
import { Heading } from '@/components/ui/heading';

export const AllSizes: Story = () => (
  <div className="space-y-4">
    <Heading size="2xl">Extra Large Heading (2xl)</Heading>
    <Heading size="xl">Large Heading (xl)</Heading>
    <Heading size="lg">Medium Heading (lg)</Heading>
  </div>
);

export const Large: Story = () => <Heading size="lg">Schema Registry</Heading>;

export const ExtraLarge: Story = () => <Heading size="xl">Dashboard</Heading>;

export const ExtraExtraLarge: Story = () => <Heading size="2xl">GraphQL Hive</Heading>;

export const WithCustomClass: Story = () => (
  <Heading size="xl" className="text-accent">
    Custom Colored Heading
  </Heading>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Heading Component</h2>
      <p className="text-neutral-11 mb-4">
        Semantic heading component with predefined sizes. Renders h1 or h3 based on size.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Size: 2xl (h1)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Heading size="2xl">Extra Large Heading</Heading>
          </div>
          <p className="text-xs text-neutral-10">
            Element: <code className="text-neutral-12">h1</code>
            <br />
            Font size: <code className="text-neutral-12">text-[28px]</code>
            <br />
            Font weight: <code className="text-neutral-12">font-extrabold</code>
            <br />
            Line height: <code className="text-neutral-12">leading-snug</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Size: xl (h3)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Heading size="xl">Large Heading</Heading>
          </div>
          <p className="text-xs text-neutral-10">
            Element: <code className="text-neutral-12">h3</code>
            <br />
            Font size: <code className="text-neutral-12">text-xl</code>
            <br />
            Font weight: <code className="text-neutral-12">font-bold</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Size: lg (h3)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Heading size="lg">Medium Heading</Heading>
          </div>
          <p className="text-xs text-neutral-10">
            Element: <code className="text-neutral-12">h3</code>
            <br />
            Font size: <code className="text-neutral-12">text-lg</code>
            <br />
            Font weight: <code className="text-neutral-12">font-bold</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Styling</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Heading size="xl" className="text-accent">
              Custom Color
            </Heading>
          </div>
          <p className="text-xs text-neutral-10">
            Use <code className="text-neutral-12">className</code> prop to override styles
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">size</code>: "lg" | "xl" | "2xl" (default: "xl")
          </li>
          <li>
            <code className="text-neutral-12">className</code>: Additional CSS classes
          </li>
          <li>
            <code className="text-neutral-12">id</code>: Element ID for anchor links
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Semantic HTML</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            size="2xl" renders <code className="text-neutral-12">&lt;h1&gt;</code>
          </li>
          <li>
            size="xl" renders <code className="text-neutral-12">&lt;h3&gt;</code>
          </li>
          <li>
            size="lg" renders <code className="text-neutral-12">&lt;h3&gt;</code>
          </li>
        </ul>
        <p className="text-neutral-10 text-xs mt-2">
          Note: Only 2xl uses h1 for top-level page headings
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Patterns</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Page Titles</p>
          <p className="text-neutral-10 text-xs">
            Use size="2xl" for main page titles (Dashboard, Schema Explorer, etc.)
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Section Headers</p>
          <p className="text-neutral-10 text-xs">
            Use size="xl" for major sections within a page
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Sub-sections</p>
          <p className="text-neutral-10 text-xs">
            Use size="lg" for smaller subsection headings
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Default Styles</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            Color: <code className="text-neutral-12">text-neutral-12</code> (always)
          </li>
          <li>
            Cursor: <code className="text-neutral-12">cursor-default</code>
          </li>
          <li>All sizes use bold or extrabold font weights</li>
        </ul>
      </div>
    </div>
  </div>
);
