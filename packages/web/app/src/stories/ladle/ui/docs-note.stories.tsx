import { DocsLink, DocsNote, ProductUpdatesLink } from '@/components/ui/docs-note';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Docs Note',
};

export const BasicNote: Story = () => (
  <div className="p-4">
    <DocsNote>
      This is a documentation note with helpful information for users. It has a left border to draw
      attention.
    </DocsNote>
  </div>
);

BasicNote.meta = {
  description: 'Basic docs note with white border',
};

export const WarnNote: Story = () => (
  <div className="p-4">
    <DocsNote warn>
      This is a warning note with important information that users should pay attention to.
    </DocsNote>
  </div>
);

WarnNote.meta = {
  description: 'Warning docs note with accent border',
};

export const WithDocsLink: Story = () => (
  <div className="p-4">
    <DocsNote>
      For more information, check out{' '}
      <DocsLink href="/features/schema-registry">our documentation</DocsLink>.
    </DocsNote>
  </div>
);

WithDocsLink.meta = {
  description: 'Docs note with documentation link',
};

export const DocsLinkStandalone: Story = () => (
  <div className="space-y-4 p-4">
    <DocsLink href="/features/schema-registry">Read about Schema Registry</DocsLink>
    <br />
    <DocsLink href="/features/tokens">Learn about Access Tokens</DocsLink>
    <br />
    <DocsLink href="https://graphql-hive.com/docs">Visit Full Documentation</DocsLink>
  </div>
);

DocsLinkStandalone.meta = {
  description: 'Standalone documentation links with book icon',
};

export const ProductUpdatesLinkStandalone: Story = () => (
  <div className="space-y-4 p-4">
    <ProductUpdatesLink href="/2024-01-15-new-feature">
      Check out our latest feature release
    </ProductUpdatesLink>
    <br />
    <ProductUpdatesLink href="#recent-updates">View recent updates (anchor)</ProductUpdatesLink>
    <br />
    <ProductUpdatesLink href="https://graphql-hive.com/blog">Read our blog</ProductUpdatesLink>
  </div>
);

ProductUpdatesLinkStandalone.meta = {
  description: 'Product updates links with megaphone icon',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">DocsNote Component</h2>
      <p className="text-neutral-11 mb-4">
        Callout box for documentation notes and helpful information. Has optional warning variant
        with accent border.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Default Note</p>
          <DocsNote>
            This is a standard documentation note. Use for helpful tips and information.
          </DocsNote>
          <p className="text-neutral-10 text-xs">
            Border: <code className="text-neutral-12">border-l-2 border-neutral-12</code>
            <br />
            Text: <code className="text-neutral-12">text-neutral-12 text-sm</code>
            <br />
            Padding: <code className="text-neutral-12">px-4 py-2</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Warning Note</p>
          <DocsNote warn>
            This is a warning note for important information that needs attention.
          </DocsNote>
          <p className="text-neutral-10 text-xs">
            Border: <code className="text-neutral-12">border-l-2 border-neutral-2</code>
            <br />
            Use <code className="text-neutral-12">warn</code> prop to show accent border
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Documentation Link</p>
          <DocsNote>
            For more details, see{' '}
            <DocsLink href="/features/schema-registry">Schema Registry documentation</DocsLink>.
          </DocsNote>
          <p className="text-neutral-10 text-xs">
            DocsLink can be embedded within DocsNote for inline documentation references
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">DocsLink Component</h2>
      <p className="text-neutral-11 mb-4">
        External link button for documentation pages. Shows book icon and external link indicator.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Documentation Links</p>
          <div className="space-y-2">
            <DocsLink href="/features/schema-registry">Learn about Schema Registry</DocsLink>
            <br />
            <DocsLink href="/features/tokens">Access Tokens Guide</DocsLink>
          </div>
          <p className="text-neutral-10 text-xs">
            Icon: <code className="text-neutral-12">Book (Lucide, 16px)</code>
            <br />
            Color: <code className="text-neutral-12">text-neutral-2</code>
            <br />
            External icon: <code className="text-neutral-12">ExternalLinkIcon</code>
            <br />
            Target: <code className="text-neutral-12">_blank with rel="noreferrer"</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">ProductUpdatesLink Component</h2>
      <p className="text-neutral-11 mb-4">
        External link button for product updates and announcements. Shows megaphone icon.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Product Update Links</p>
          <div className="space-y-2">
            <ProductUpdatesLink href="/2024-01-15-new-feature">
              New Feature Announcement
            </ProductUpdatesLink>
            <br />
            <ProductUpdatesLink href="#updates">Scroll to Updates</ProductUpdatesLink>
          </div>
          <p className="text-neutral-10 text-xs">
            Icon: <code className="text-neutral-12">Megaphone (Lucide, 16px)</code>
            <br />
            Color: <code className="text-neutral-12">text-blue-500</code>
            <br />
            Anchor links (starting with #) don't open in new tab
            <br />
            External links show ExternalLinkIcon and open in new tab
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">DocsNote</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode
            </li>
            <li>
              <code className="text-neutral-12">warn</code>: boolean (optional) - Use accent border
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional)
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">DocsLink</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">href</code>: string - URL or path (auto-prefixed
              with docs URL if relative)
            </li>
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode (optional)
            </li>
            <li>
              <code className="text-neutral-12">icon</code>: ReactElement (optional) - Custom icon,
              defaults to Book
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional)
            </li>
          </ul>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">ProductUpdatesLink</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">href</code>: string - URL, path, or anchor
            </li>
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode (optional)
            </li>
            <li>
              <code className="text-neutral-12">icon</code>: ReactElement (optional) - Custom icon,
              defaults to Megaphone
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Notes</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">DocsLink URL handling:</strong> Relative paths
            auto-prefixed with <code className="text-neutral-12">getDocsUrl()</code>
          </li>
          <li>
            <strong className="text-neutral-12">ProductUpdatesLink URL handling:</strong> Relative
            paths prefixed with <code className="text-neutral-12">getProductUpdatesUrl()</code>,
            anchor links (#) treated as in-page
          </li>
          <li>
            <strong className="text-neutral-12">Both links:</strong> Render as Button variant="link"
            with target="_blank"
          </li>
          <li>
            <strong className="text-neutral-12">Whitespace:</strong> DocsLink uses
            whitespace-pre-wrap to preserve spaces between tags
          </li>
        </ul>
      </div>
    </div>
  </div>
);
