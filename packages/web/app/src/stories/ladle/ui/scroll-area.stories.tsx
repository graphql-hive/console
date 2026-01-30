import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Scroll Area',
};

export const VerticalScroll: Story = () => (
  <ScrollArea className="border-neutral-6 h-72 w-96 rounded-md border p-4">
    <h4 className="text-neutral-12 mb-4 text-sm font-medium">GraphQL Schema Types</h4>
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i}>
        <div className="text-neutral-11 py-2 text-sm">Type {i + 1}</div>
        {i < 19 && <Separator />}
      </div>
    ))}
  </ScrollArea>
);

export const HorizontalScroll: Story = () => (
  <ScrollArea className="border-neutral-6 w-96 whitespace-nowrap rounded-md border p-4">
    <div className="flex gap-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="bg-neutral-3 flex size-20 shrink-0 items-center justify-center rounded-md"
        >
          <span className="text-neutral-11 text-sm">{i + 1}</span>
        </div>
      ))}
    </div>
  </ScrollArea>
);

export const LongContent: Story = () => (
  <ScrollArea className="border-neutral-6 h-96 w-full max-w-2xl rounded-md border p-6">
    <h3 className="text-neutral-12 mb-4 text-lg font-semibold">GraphQL Hive Documentation</h3>
    <div className="text-neutral-11 space-y-4 text-sm">
      <p>
        GraphQL Hive is a comprehensive schema registry, analytics platform, and gateway for GraphQL
        APIs. It helps teams manage their GraphQL schemas, track changes, prevent breaking changes,
        and monitor API usage.
      </p>
      <p>
        With GraphQL Hive, you can push your schema, validate changes against your production
        traffic, and get insights into how your API is being used. The platform supports both
        self-hosted and cloud deployments.
      </p>
      <h4 className="text-neutral-12 pt-4 font-medium">Key Features</h4>
      <ul className="list-inside list-disc space-y-2">
        <li>Schema Registry - Version control for your GraphQL schemas</li>
        <li>Breaking Change Detection - Catch issues before they reach production</li>
        <li>Usage Analytics - Understand how clients use your API</li>
        <li>Performance Monitoring - Track query performance and identify bottlenecks</li>
        <li>Federation Support - Manage federated GraphQL architectures</li>
      </ul>
      <h4 className="text-neutral-12 pt-4 font-medium">Getting Started</h4>
      <p>Install the Hive CLI to start pushing your schema:</p>
      <code className="bg-neutral-3 mt-2 block rounded-sm p-2 font-mono text-xs">
        npm install -g @graphql-hive/cli
      </code>
      <p className="pt-2">Then push your schema to the registry:</p>
      <code className="bg-neutral-3 mt-2 block rounded-sm p-2 font-mono text-xs">
        hive schema:publish schema.graphql
      </code>
    </div>
  </ScrollArea>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">ScrollArea Component</h2>
      <p className="text-neutral-11 mb-4">
        Custom scrollbar component built with Radix UI. Provides consistent scrolling experience
        across browsers.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Vertical Scrolling</p>
          <ScrollArea className="border-neutral-6 h-48 w-96 rounded-md border p-4">
            <div className="space-y-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <p key={i} className="text-neutral-11 text-sm">
                  Item {i + 1}
                </p>
              ))}
            </div>
          </ScrollArea>
          <p className="text-neutral-10 text-xs">
            Scrollbar width: <code className="text-neutral-12">w-2.5</code>
            <br />
            Thumb: <code className="text-neutral-12">bg-neutral-5 rounded-full</code>
            <br />
            Overflow: <code className="text-neutral-12">overflow-hidden</code> on root
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Horizontal Scrolling</p>
          <ScrollArea className="border-neutral-6 w-96 whitespace-nowrap rounded-md border p-4">
            <div className="flex gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-3 flex size-16 shrink-0 items-center justify-center rounded"
                >
                  <span className="text-neutral-11 text-sm">{i + 1}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <p className="text-neutral-10 text-xs">
            Scrollbar height: <code className="text-neutral-12">h-2.5</code>
            <br />
            Direction: <code className="text-neutral-12">orientation="horizontal"</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">ScrollArea</code>: Root container with overflow hidden
          </li>
          <li>
            <code className="text-neutral-12">ScrollBar</code>: Custom scrollbar (auto-included)
          </li>
          <li>
            Internal Viewport: <code className="text-neutral-12">size-full rounded-[inherit]</code>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">className</code>: Custom styles (set height for
            vertical, width for horizontal)
          </li>
          <li>
            <code className="text-neutral-12">orientation</code>: "vertical" (default) |
            "horizontal" (on ScrollBar)
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Long Lists</p>
          <p className="text-neutral-10 text-xs">
            Scrollable lists of items, logs, or data tables with many rows.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Code Blocks</p>
          <p className="text-neutral-10 text-xs">
            Long code snippets or JSON that need horizontal or vertical scrolling.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Modal Content</p>
          <p className="text-neutral-10 text-xs">
            Long content in dialogs, sheets, or popovers that exceeds viewport height.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Navigation Menus</p>
          <p className="text-neutral-10 text-xs">
            Dropdown menus or command palettes with many options.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Browser Compatibility</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-11 mb-2 text-sm">
          Provides consistent scrollbar appearance across all browsers
        </p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>Replaces native scrollbars with custom styled ones</li>
          <li>Touch-friendly on mobile devices</li>
          <li>Keyboard accessible (arrow keys, page up/down)</li>
          <li>Smooth transitions and animations</li>
        </ul>
      </div>
    </div>
  </div>
);
