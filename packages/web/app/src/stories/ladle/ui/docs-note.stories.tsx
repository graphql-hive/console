import type { Story } from '@ladle/react';
import { DocsNote, DocsLink, ProductUpdatesLink } from '@/components/ui/docs-note';

export const BasicNote: Story = () => (
  <div className="p-4">
    <DocsNote>
      This is a documentation note with helpful information for users. It has a left border to
      draw attention.
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
      For more information, check out <DocsLink href="/features/schema-registry">our documentation</DocsLink>.
    </DocsNote>
  </div>
);

WithDocsLink.meta = {
  description: 'Docs note with documentation link',
};

export const DocsLinkStandalone: Story = () => (
  <div className="p-4 space-y-4">
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
  <div className="p-4 space-y-4">
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
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">DocsNote Component</h2>
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
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-l-2 border-white</code>
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
          <p className="text-xs text-neutral-10">
            Border: <code className="text-neutral-12">border-l-2 border-accent</code>
            <br />
            Use <code className="text-neutral-12">warn</code> prop to show accent border
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Documentation Link</p>
          <DocsNote>
            For more details, see <DocsLink href="/features/schema-registry">Schema Registry documentation</DocsLink>.
          </DocsNote>
          <p className="text-xs text-neutral-10">
            DocsLink can be embedded within DocsNote for inline documentation references
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">DocsLink Component</h2>
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
          <p className="text-xs text-neutral-10">
            Icon: <code className="text-neutral-12">Book (Lucide, 16px)</code>
            <br />
            Color: <code className="text-neutral-12">text-accent</code>
            <br />
            External icon: <code className="text-neutral-12">ExternalLinkIcon</code>
            <br />
            Target: <code className="text-neutral-12">_blank with rel="noreferrer"</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">ProductUpdatesLink Component</h2>
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
          <p className="text-xs text-neutral-10">
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
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">DocsNote</p>
          <ul className="text-xs space-y-1 text-neutral-10">
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

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">DocsLink</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">href</code>: string - URL or path (auto-prefixed
              with docs URL if relative)
            </li>
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode (optional)
            </li>
            <li>
              <code className="text-neutral-12">icon</code>: ReactElement (optional) - Custom
              icon, defaults to Book
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional)
            </li>
          </ul>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ProductUpdatesLink</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">href</code>: string - URL, path, or anchor
            </li>
            <li>
              <code className="text-neutral-12">children</code>: React.ReactNode (optional)
            </li>
            <li>
              <code className="text-neutral-12">icon</code>: ReactElement (optional) - Custom
              icon, defaults to Megaphone
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Notes</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
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
            <strong className="text-neutral-12">Both links:</strong> Render as Button
            variant="link" with target="_blank"
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
