import type { Story } from '@ladle/react';
import { Link } from '@/components/ui/link';

export const Primary: Story = () => (
  <Link as="a" href="#" variant="primary">
    Primary Link
  </Link>
);

export const Secondary: Story = () => (
  <Link as="a" href="#" variant="secondary">
    Secondary Link
  </Link>
);

export const InSentence: Story = () => (
  <p className="text-neutral-11 text-sm">
    Check out our{' '}
    <Link as="a" href="#" variant="primary">
      documentation
    </Link>{' '}
    to learn more about GraphQL Hive.
  </p>
);

export const MultipleLinks: Story = () => (
  <div className="space-y-2">
    <p className="text-neutral-11 text-sm">
      <Link as="a" href="#" variant="primary">
        Getting Started Guide
      </Link>
    </p>
    <p className="text-neutral-11 text-sm">
      <Link as="a" href="#" variant="secondary">
        API Reference
      </Link>
    </p>
    <p className="text-neutral-11 text-sm">
      <Link as="a" href="#" variant="primary">
        Examples & Tutorials
      </Link>
    </p>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Link Component</h2>
      <p className="text-neutral-11 mb-4">
        Styled link component with variants. Wraps TanStack Router Link or renders as anchor tag.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Primary Variant</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Link as="a" href="#" variant="primary">
              Primary Link Example
            </Link>
          </div>
          <p className="text-xs text-neutral-10">
            Color: <code className="text-neutral-12">text-accent</code>
            <br />
            Hover: <code className="text-neutral-12">hover:underline</code>
            <br />
            Font weight: <code className="text-neutral-12">font-medium</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Secondary Variant</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Link as="a" href="#" variant="secondary">
              Secondary Link Example
            </Link>
          </div>
          <p className="text-xs text-neutral-10">
            Color: <code className="text-neutral-12">text-neutral-10</code>
            <br />
            Hover: <code className="text-neutral-12">hover:text-neutral-11</code>
            <br />
            Font weight: <code className="text-neutral-12">font-medium</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">In Context</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm">
              Learn more in our{' '}
              <Link as="a" href="#" variant="primary">
                documentation
              </Link>{' '}
              or read the{' '}
              <Link as="a" href="#" variant="secondary">
                API reference
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">variant</code>: "primary" (default) | "secondary"
          </li>
          <li>
            <code className="text-neutral-12">as</code>: "a" - renders as anchor tag instead of
            router link
          </li>
          <li>
            <code className="text-neutral-12">href</code>: URL (when using as="a")
          </li>
          <li>
            <code className="text-neutral-12">to</code>: Route path (when using router link)
          </li>
          <li>
            <code className="text-neutral-12">target</code>: "_blank" for new tab
          </li>
          <li>
            <code className="text-neutral-12">className</code>: Additional CSS classes
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Internal Navigation</p>
          <code className="text-xs text-neutral-10 block">
            {`<Link to="/dashboard">Dashboard</Link>`}
          </code>
          <p className="text-xs text-neutral-10 mt-2">Uses TanStack Router for client-side navigation</p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">External Links</p>
          <code className="text-xs text-neutral-10 block">
            {`<Link as="a" href="https://..." target="_blank">Docs</Link>`}
          </code>
          <p className="text-xs text-neutral-10 mt-2">
            Use as="a" for external URLs or anchor links
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">When to Use</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Primary Variant</p>
          <p className="text-neutral-10 text-xs">
            Main navigation links, CTAs, documentation links, and emphasized actions
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Secondary Variant</p>
          <p className="text-neutral-10 text-xs">
            Less prominent links, footer links, or when you need subtler styling
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Accessibility</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>Uses semantic &lt;a&gt; tags</li>
          <li>Supports all standard link attributes (href, target, rel)</li>
          <li>Keyboard accessible (Tab to focus, Enter to activate)</li>
          <li>Color contrast meets WCAG guidelines</li>
        </ul>
      </div>
    </div>
  </div>
);
