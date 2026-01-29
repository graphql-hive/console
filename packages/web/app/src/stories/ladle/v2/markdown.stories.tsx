import type { Story } from '@ladle/react';
import { Markdown } from '@/components/v2/markdown';

export default {
  title: 'V2 / Markdown',
};

export const Simple: Story = () => <Markdown content="This is **bold** and this is *italic*." />;

export const Headings: Story = () => (
  <Markdown
    content={`# Heading 1
## Heading 2
### Heading 3

Regular paragraph text.`}
  />
);

export const Lists: Story = () => (
  <Markdown
    content={`## Unordered List
- Item 1
- Item 2
- Item 3

## Ordered List
1. First
2. Second
3. Third`}
  />
);

export const Links: Story = () => (
  <Markdown content="Check out [GraphQL Hive](https://the-guild.dev/graphql/hive) for more info." />
);

export const Code: Story = () => (
  <Markdown
    content={`Inline code: \`const x = 42;\`

Code block:
\`\`\`
function hello() {
  console.log("Hello, world!");
}
\`\`\``}
  />
);

export const ComplexExample: Story = () => (
  <div className="max-w-2xl">
    <Markdown
      content={`# GraphQL Hive Documentation

GraphQL Hive is a **schema registry** and monitoring solution.

## Features

- Schema versioning and history
- Breaking change detection
- Operation monitoring
- Performance analytics

## Quick Start

1. Install the client: \`npm install @graphql-hive/client\`
2. Configure with your token
3. Start reporting schemas

For more info, visit [our docs](https://the-guild.dev/graphql/hive/docs).`}
    />
  </div>
);

export const WithCustomStyling: Story = () => (
  <Markdown
    content="This is **markdown** with custom styling."
    className="rounded-lg border border-neutral-6 bg-neutral-1 p-4"
  />
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Markdown Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Simple markdown renderer using snarkdown for parsing and dompurify for sanitization.
        Renders markdown as HTML with custom styling via hive-markdown class.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Styling Class</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">hive-markdown</code>
          <span className="text-neutral-11 text-xs">
            - Default class (styles defined in global CSS)
          </span>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            This class is applied to the wrapper div and can be used to style all markdown elements
            globally
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Supported Markdown</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Snarkdown supports:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>**Bold** and *italic* text</li>
            <li>Headings (# through ######)</li>
            <li>Links [text](url)</li>
            <li>Lists (ordered and unordered)</li>
            <li>Inline `code`</li>
            <li>Code blocks (```)</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Security</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">DOMPurify sanitization:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Prevents XSS attacks</li>
            <li>Strips dangerous HTML/scripts</li>
            <li>Safe to use with user-generated content</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Rendering Process</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Three-step process:</p>
          <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
            <li>Parse markdown to HTML (snarkdown)</li>
            <li>Sanitize HTML (dompurify)</li>
            <li>Render via dangerouslySetInnerHTML</li>
          </ol>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Performance</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">useMemo</code>
          <span className="text-neutral-11 text-xs">
            - Memoizes sanitized HTML to avoid re-parsing
          </span>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            Only re-processes when content prop changes
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-4">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Documentation:</p>
          <Markdown
            content="Read the **docs** for more info about [GraphQL](https://graphql.org)."
            className="rounded-sm border border-neutral-6 bg-neutral-1 p-3 text-sm"
          />
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">User-generated content:</p>
          <Markdown
            content="User wrote: *This is amazing!*"
            className="rounded-sm border border-neutral-6 bg-neutral-1 p-3 text-sm"
          />
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses forwardRef for ref forwarding to div element</li>
        <li>Snarkdown is a lightweight (1KB) markdown parser</li>
        <li>DOMPurify ensures safe HTML rendering</li>
        <li>Custom className merged with hive-markdown</li>
        <li>All div props supported via spread</li>
        <li>Memoized to prevent unnecessary re-processing</li>
        <li>Relies on global CSS for markdown element styling</li>
      </ul>
    </div>
  </div>
);
