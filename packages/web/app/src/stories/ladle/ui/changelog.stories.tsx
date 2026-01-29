import { Changelog, type Changelog as ChangelogType } from '@/components/ui/changelog/changelog';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Changelog',
};

const mockChanges: ChangelogType[] = [
  {
    date: '2026-01-20',
    href: 'https://the-guild.dev/graphql/hive/product-updates/2025-12-10-schema-checks',
    title: 'Schema Checks Show Affected App Deployments',
    description:
      'See which app deployments would be impacted by breaking schema changes before deploying.',
  },
  {
    date: '2026-01-15',
    href: 'https://the-guild.dev/graphql/hive/product-updates/2025-12-09-stale-deployments',
    title: 'Find and Clean Up Stale App Deployments',
    description: 'Query app deployments by last usage to identify candidates for retirement.',
  },
  {
    date: '2025-12-11',
    href: 'https://the-guild.dev/graphql/hive/product-updates/2025-12-09-versioned-cdn',
    title: 'Versioned CDN Artifacts',
    description:
      'Retrieve CDN artifacts for specific schema versions using new versioned endpoints.',
  },
  {
    date: '2025-11-28',
    href: 'https://the-guild.dev/graphql/hive/product-updates/2025-11-28-router-usage',
    title: 'Usage Reporting in Hive Router',
    description:
      'Hive Router (Rust) now supports Usage Reporting, allowing you to send operation metrics to Hive Console',
  },
];

export const Default: Story = () => (
  <div className="flex justify-end p-4">
    <Changelog changes={mockChanges} />
  </div>
);

Default.meta = {
  description: 'Changelog popover button (click to open)',
};

export const SingleChange: Story = () => (
  <div className="flex justify-end p-4">
    <Changelog
      changes={[
        {
          date: '2026-01-20',
          href: 'https://example.com/update-1',
          title: 'New Feature Released',
          description: 'We just released an amazing new feature that improves your workflow.',
        },
      ]}
    />
  </div>
);

SingleChange.meta = {
  description: 'Changelog with single change',
};

export const NoChanges: Story = () => (
  <div className="flex justify-end p-4">
    <Changelog changes={[]} />
    <p className="text-neutral-11 ml-4 text-sm">(Button not shown when no changes)</p>
  </div>
);

NoChanges.meta = {
  description: 'Changelog with no changes (button hidden)',
};

export const LongDescriptions: Story = () => (
  <div className="flex justify-end p-4">
    <Changelog
      changes={[
        {
          date: '2026-01-20',
          href: 'https://example.com/update-1',
          title: 'Major Performance Improvements Across the Platform',
          description:
            'We have rolled out significant performance improvements across the entire platform. This includes faster schema validation, improved query execution times, reduced memory usage in the CDN, and optimized database queries. These changes result in up to 50% faster response times for most operations.',
        },
        {
          date: '2026-01-15',
          href: 'https://example.com/update-2',
          title: 'Enhanced Security Features',
          description:
            'New security features include two-factor authentication, IP allowlisting, audit logs for all administrative actions, and improved token management with granular permissions.',
        },
      ]}
    />
  </div>
);

LongDescriptions.meta = {
  description: 'Changelog with long titles and descriptions',
};

export const InHeader: Story = () => (
  <div className="border-neutral-6 bg-neutral-1 border-b p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-neutral-12 font-semibold">GraphQL Hive</span>
      </div>
      <div className="flex items-center gap-4">
        <Changelog changes={mockChanges} />
        <div className="bg-neutral-6 size-8 rounded-full" />
      </div>
    </div>
  </div>
);

InHeader.meta = {
  description: 'Changelog in header context (as used in user-menu)',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Changelog Component</h2>
      <p className="text-neutral-11 mb-4">
        Popover button that displays recent product updates and changes. Uses local storage to track
        which changes have been read and shows a pulsing dot indicator for new changes. Rendered
        alongside the user menu in application headers.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Changelog Button</p>
          <div className="bg-neutral-1 border-neutral-6 flex justify-end rounded-sm border p-4">
            <Changelog changes={mockChanges} />
          </div>
          <p className="text-neutral-10 text-xs">
            Button: <code className="text-neutral-12">variant="outline" text-sm</code>
            <br />
            Label: "Latest changes"
            <br />
            Indicator: Pulsing <code className="text-neutral-12">bg-accent</code> dot when unread
            changes
            <br />
            Position: <code className="text-neutral-12">absolute right-0 top-0 -mr-1 -mt-1</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Popover Structure</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <ul className="text-neutral-10 space-y-1 text-xs">
              <li>
                1. <strong className="text-neutral-12">Header:</strong> Title + description in{' '}
                <code className="text-neutral-12">p-4</code>
              </li>
              <li>
                2. <strong className="text-neutral-12">List:</strong> Ordered list with{' '}
                <code className="text-neutral-12">relative</code> positioning
              </li>
              <li>
                3. <strong className="text-neutral-12">Items:</strong> Each with date, title (link),
                description
              </li>
              <li>
                4. <strong className="text-neutral-12">Footer:</strong> "View all updates" link
              </li>
            </ul>
            <p className="text-neutral-10 mt-2 text-xs">
              Popover width: <code className="text-neutral-12">w-[550px]</code>
              <br />
              Collision padding: <code className="text-neutral-12">20</code> (stays on screen)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">List Item Colors</p>
          <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
            <div>
              <time className="text-neutral-10 text-xs font-normal">20th January 2026</time>
              <h3 className="text-neutral-12 text-base font-medium hover:underline">
                <a href="#" className="hover:underline">
                  Example Update Title
                </a>
              </h3>
              <div className="text-neutral-11 text-sm font-normal">
                This is a description of the update with some details about what changed.
              </div>
            </div>
            <p className="text-neutral-10 border-neutral-6 border-t pt-2 text-xs">
              Date: <code className="text-neutral-12">text-neutral-10 text-xs</code>
              <br />
              Title: <code className="text-neutral-12">text-neutral-12 text-base font-medium</code>
              <br />
              Description: <code className="text-neutral-12">text-neutral-11 text-sm</code>
              <br />
              Unread indicator: <code className="text-neutral-12">border-l-2 border-accent_80</code>
              <br />
              Read items: <code className="text-neutral-12">border-transparent</code>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">New Changes Indicator</p>
          <div className="bg-neutral-1 border-neutral-6 flex justify-center rounded-sm border p-4">
            <div className="relative inline-flex">
              <button className="border-neutral-6 text-neutral-12 rounded-sm border px-3 py-2 text-sm">
                Latest changes
                <div className="absolute right-0 top-0 -mr-1 -mt-1 flex size-2">
                  <div className="bg-accent absolute inline-flex size-full animate-pulse rounded-full" />
                </div>
              </button>
            </div>
          </div>
          <p className="text-neutral-10 text-xs">
            Dot:{' '}
            <code className="text-neutral-12">size-2 bg-accent animate-pulse rounded-full</code>
            <br />
            Position: <code className="text-neutral-12">absolute right-0 top-0 -mr-1 -mt-1</code>
            <br />
            Shown when: Local storage indicates unread changes
            <br />
            Hidden when: Popover is opened
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Interactive Example</p>
          <div className="bg-neutral-1 border-neutral-6 flex justify-center rounded-sm border p-4">
            <Changelog changes={mockChanges} />
          </div>
          <p className="text-neutral-10 text-xs">
            Click to open popover, then click a change title to mark it as read. The accent border
            disappears when marked read.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">changes</code>: Changelog[] - Array of change objects
          </li>
        </ul>
        <p className="text-neutral-10 mt-3 text-xs">Changelog type:</p>
        <ul className="text-neutral-10 mt-1 space-y-1 text-xs">
          <li>
            <code className="text-neutral-12">title</code>: string - Change title
          </li>
          <li>
            <code className="text-neutral-12">description</code>: string - Change description
          </li>
          <li>
            <code className="text-neutral-12">href</code>: string - Link to full change details
          </li>
          <li>
            <code className="text-neutral-12">route</code>: string (optional) - Internal route
            (unused)
          </li>
          <li>
            <code className="text-neutral-12">date</code>: string - ISO date string (YYYY-MM-DD)
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Local Storage Tracking</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            <strong className="text-neutral-12">hive:changelog:dot:</strong> Boolean - Whether to
            show the dot indicator
          </li>
          <li>
            <strong className="text-neutral-12">hive:changelog:read:</strong> string[] - Array of
            read change hrefs
          </li>
          <li>
            When popover opens, dot is hidden (
            <code className="text-neutral-12">setDisplayDot(false)</code>)
          </li>
          <li>Clicking a change title adds its href to read list and removes accent border</li>
          <li>Unread changes detected by comparing changes array with read list</li>
          <li>
            Read list is cleaned up automatically - only keeps hrefs from current changes array
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Data Source</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <p className="text-neutral-10 mb-2 text-xs">
          Changes are loaded from{' '}
          <code className="text-neutral-12">@/components/ui/changelog/generated-changelog.ts</code>
        </p>
        <p className="text-neutral-10 text-xs">
          This file is auto-generated and contains the latest product updates from the GraphQL Hive
          product updates page.
        </p>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Context</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            Rendered in <code className="text-neutral-12">UserMenu</code> component
          </li>
          <li>
            Appears in header layouts:{' '}
            <code className="text-neutral-12">
              flex gap-8 with GetStartedProgress + Changelog + UserMenu
            </code>
          </li>
          <li>Always positioned to the right side of the header</li>
          <li>Changes loaded from generated file on app mount</li>
          <li>
            Footer link opens full product updates page:{' '}
            <code className="text-neutral-12">
              https://the-guild.dev/graphql/hive/product-updates
            </code>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation Details</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-2 text-xs">
          <li>
            Date formatting: <code className="text-neutral-12">date-fns/format</code> with "do MMMM
            yyyy" (e.g., "20th January 2026")
          </li>
          <li>
            Popover uses <code className="text-neutral-12">Popover</code>,{' '}
            <code className="text-neutral-12">PopoverTrigger</code>,{' '}
            <code className="text-neutral-12">PopoverContent</code>,{' '}
            <code className="text-neutral-12">PopoverArrow</code>
          </li>
          <li>
            All change links open in new tab with{' '}
            <code className="text-neutral-12">target="_blank" rel="noreferrer"</code>
          </li>
          <li>
            List is an <code className="text-neutral-12">&lt;ol&gt;</code> with timeline appearance
            via left borders
          </li>
          <li>
            Button only renders if <code className="text-neutral-12">changes.length &gt; 0</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
);
