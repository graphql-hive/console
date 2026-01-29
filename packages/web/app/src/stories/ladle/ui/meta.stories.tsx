import { Meta } from '@/components/ui/meta';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Meta',
};

export const Default: Story = () => (
  <div className="space-y-4">
    <Meta title="Dashboard" />
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <p className="text-neutral-11 text-sm">
        Check the browser tab title - it should show "Dashboard | Hive"
      </p>
      <p className="text-neutral-10 mt-2 text-xs">
        This component uses react-helmet-async to set page metadata including title, description,
        and Open Graph tags.
      </p>
    </div>
  </div>
);

export const CustomTitle: Story = () => (
  <div className="space-y-4">
    <Meta title="Schema Explorer" />
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <p className="text-neutral-11 text-sm">Title: "Schema Explorer | Hive"</p>
    </div>
  </div>
);

export const WithCustomDescription: Story = () => (
  <div className="space-y-4">
    <Meta
      title="Getting Started"
      description="Learn how to integrate GraphQL Hive into your workflow and start tracking your schema changes."
    />
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <p className="text-neutral-11 text-sm">
        Title: "Getting Started | Hive"
        <br />
        Description: Custom description for this page
      </p>
    </div>
  </div>
);

export const WithCustomSuffix: Story = () => (
  <div className="space-y-4">
    <Meta title="Admin Panel" suffix="GraphQL Hive Admin" />
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <p className="text-neutral-11 text-sm">Title: "Admin Panel | GraphQL Hive Admin"</p>
    </div>
  </div>
);

export const NoSuffix: Story = () => (
  <div className="space-y-4">
    <Meta title="Standalone Page Title" suffix="" />
    <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
      <p className="text-neutral-11 text-sm">Title: "Standalone Page Title" (no suffix)</p>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <Meta
      title="Meta Component Documentation"
      description="Documentation for the Meta component that manages page metadata and Open Graph tags."
    />

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Meta Component</h2>
      <p className="text-neutral-11 mb-4">
        Manages page metadata including title, description, and Open Graph tags using
        react-helmet-async.
      </p>
      <p className="text-neutral-10 text-sm">
        Note: This component doesn't render visible UI. Check the browser tab and view page source
        to see the generated meta tags.
      </p>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-2 text-sm">
          <li>
            <code className="text-neutral-12">title</code> (required): Page title
          </li>
          <li>
            <code className="text-neutral-12">description</code> (optional): Meta description
            <br />
            <span className="text-neutral-10 text-xs">
              Default: "Fully Open-source schema registry, analytics and gateway..."
            </span>
          </li>
          <li>
            <code className="text-neutral-12">suffix</code> (optional): Title suffix
            <br />
            <span className="text-neutral-10 text-xs">Default: "Hive"</span>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Generated Meta Tags</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 font-mono text-xs">
          <li>&lt;title&gt;{'{title} | {suffix}'}&lt;/title&gt;</li>
          <li>&lt;meta property="og:title" content="{'{title} | {suffix}'}" /&gt;</li>
          <li>&lt;meta name="description" content="{'{description}'}" /&gt;</li>
          <li>&lt;meta property="og:url" content="https://app.graphql-hive.com" /&gt;</li>
          <li>&lt;meta property="og:type" content="website" /&gt;</li>
          <li>&lt;meta property="og:image" content="[OG image URL]" /&gt;</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Examples</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Dashboard Page</p>
          <code className="text-neutral-10 text-xs">&lt;Meta title="Dashboard" /&gt;</code>
          <p className="text-neutral-10 mt-2 text-xs">Result: "Dashboard | Hive"</p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Schema Explorer</p>
          <code className="text-neutral-10 text-xs">
            &lt;Meta title="Schema Explorer" description="Explore your GraphQL schema types and
            fields" /&gt;
          </code>
          <p className="text-neutral-10 mt-2 text-xs">
            Result: "Schema Explorer | Hive" with custom description
          </p>
        </div>

        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Organization Page</p>
          <code className="text-neutral-10 text-xs">&lt;Meta title="My Organization" /&gt;</code>
          <p className="text-neutral-10 mt-2 text-xs">Result: "My Organization | Hive"</p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">SEO Benefits</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Page Title</p>
          <p className="text-neutral-10 text-xs">
            Appears in browser tabs, search results, and bookmarks. Format: "Page Name | Hive"
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Meta Description</p>
          <p className="text-neutral-10 text-xs">
            Shown in search engine results. Provides context about page content.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Open Graph Tags</p>
          <p className="text-neutral-10 text-xs">
            Controls how pages appear when shared on social media (Twitter, Facebook, LinkedIn,
            etc.)
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-11 mb-2 text-sm">Uses react-helmet-async</p>
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>Server-side rendering compatible</li>
          <li>Automatically manages duplicate meta tags</li>
          <li>Updates meta tags without full page reload</li>
          <li>Last rendered Meta component wins (useful for nested routes)</li>
        </ul>
      </div>
    </div>
  </div>
);
