import { Accordion } from '@/components/v2/accordion';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Accordion',
};

export const Single: Story = () => (
  <Accordion>
    <Accordion.Item value="item-1">
      <Accordion.Header>What is GraphQL Hive?</Accordion.Header>
      <Accordion.Content>
        GraphQL Hive is a schema registry and monitoring solution for GraphQL APIs.
      </Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Header>How does it work?</Accordion.Header>
      <Accordion.Content>
        It provides schema management, operation tracking, and performance monitoring for your
        GraphQL services.
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

export const Multiple: Story = () => (
  <Accordion type="multiple" defaultValue={['item-1', 'item-3']}>
    <Accordion.Item value="item-1">
      <Accordion.Header>Features</Accordion.Header>
      <Accordion.Content>
        Schema registry, breaking change detection, operation monitoring, and performance analytics.
      </Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Header>Pricing</Accordion.Header>
      <Accordion.Content>Free for open source projects, paid plans for teams.</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-3">
      <Accordion.Header>Support</Accordion.Header>
      <Accordion.Content>
        Documentation, community support on Discord, and email support for paid plans.
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

export const WithDefaultValue: Story = () => (
  <Accordion defaultValue="item-2">
    <Accordion.Item value="item-1">
      <Accordion.Header>Installation</Accordion.Header>
      <Accordion.Content>Install via npm: npm install @graphql-hive/client</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Header>Configuration</Accordion.Header>
      <Accordion.Content>
        Configure with your API token and endpoint. See documentation for details.
      </Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-3">
      <Accordion.Header>Usage</Accordion.Header>
      <Accordion.Content>Import and use in your GraphQL server setup.</Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

export const Disabled: Story = () => (
  <Accordion disabled>
    <Accordion.Item value="item-1">
      <Accordion.Header>Disabled Item 1</Accordion.Header>
      <Accordion.Content>This content cannot be opened.</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item value="item-2">
      <Accordion.Header>Disabled Item 2</Accordion.Header>
      <Accordion.Content>This content also cannot be opened.</Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

export const FAQExample: Story = () => (
  <div className="max-w-2xl">
    <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Frequently Asked Questions</h3>
    <Accordion>
      <Accordion.Item value="free">
        <Accordion.Header>Is GraphQL Hive free?</Accordion.Header>
        <Accordion.Content>
          Yes, GraphQL Hive is free for open source projects and offers a generous free tier for
          commercial use.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="hosted">
        <Accordion.Header>Is it self-hosted or cloud?</Accordion.Header>
        <Accordion.Content>
          Both! You can use our managed cloud service or self-host the open source version.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="languages">
        <Accordion.Header>What languages are supported?</Accordion.Header>
        <Accordion.Content>
          GraphQL Hive works with any GraphQL server. We provide official clients for Node.js,
          Python, and more.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Accordion Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Radix UI Accordion wrapper with composed subcomponents. Supports single and multiple
        selection modes with animated chevron icon.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-neutral-11 text-sm font-medium">Header text</span>
          <code className="text-xs">text-neutral-11 text-sm font-medium</code>
          <span className="text-neutral-11 text-xs">- Header styling</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-2 text-sm">Content text</span>
          <code className="text-xs">text-sm text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Content styling</span>
        </div>
        <div className="flex items-center gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 15 15"
            className="text-neutral-2"
            fill="currentColor"
          >
            <path d="M4 6l3.5 3.5L11 6" />
          </svg>
          <code className="text-xs">text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Chevron icon color</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Border Radius</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[state=closed]:rounded-lg</code>
          <span className="text-neutral-11 text-xs">- Trigger when closed</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">data-[state=open]:rounded-t-lg</code>
          <span className="text-neutral-11 text-xs">- Trigger when open (top only)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-b-lg</code>
          <span className="text-neutral-11 text-xs">- Content (bottom only)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-md</code>
          <span className="text-neutral-11 text-xs">- Item container</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Chevron Animation</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">group-data-[state=open]:rotate-180</code>
          <span className="text-neutral-11 text-xs">- Rotates when item opens</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">group-data-[state=open]:duration-300</code>
          <span className="text-neutral-11 text-xs">- 300ms transition</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">ease-in-out</code>
          <span className="text-neutral-11 text-xs">- Smooth easing</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">w-full</code>
          <span className="text-neutral-11 text-xs">- Root, Item, Header full width</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">inline-flex items-center justify-between</code>
          <span className="text-neutral-11 text-xs">- Trigger layout</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-4 py-2</code>
          <span className="text-neutral-11 text-xs">- Trigger padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-4 pb-3 pt-1</code>
          <span className="text-neutral-11 text-xs">- Content padding</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Pattern</h4>
      <div className="space-y-2">
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`<Accordion type="single" defaultValue="item-1">
  <Accordion.Item value="item-1">
    <Accordion.Header>Title</Accordion.Header>
    <Accordion.Content>Content</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
        </pre>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Type Modes</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Single mode (default):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Only one item can be open at a time</li>
            <li>Collapsible prop allows closing the open item</li>
            <li>Value is a string</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Multiple mode:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Multiple items can be open simultaneously</li>
            <li>Value is an array of strings</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses Radix UI Accordion primitives (Root, Item, Header, Trigger, Content)</li>
        <li>Object.assign pattern to attach subcomponents</li>
        <li>ChevronDownIcon from Radix Icons</li>
        <li>Group class on trigger enables child element styling based on state</li>
        <li>Data attribute data-cy="accordion" for testing</li>
        <li>Focus outline disabled (focus:outline-none)</li>
        <li>Custom triggerClassName prop for additional trigger styling</li>
        <li>TypeScript discriminated union for type/defaultValue</li>
      </ul>
    </div>
  </div>
);
