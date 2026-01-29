import type { Story } from '@ladle/react';
import { Subtitle, Title } from '@/components/ui/page';

export const TitleOnly: Story = () => <Title>Page Title</Title>;

export const WithSubtitle: Story = () => (
  <div className="space-y-2">
    <Title>Dashboard</Title>
    <Subtitle>View your organization's GraphQL schema analytics and insights</Subtitle>
  </div>
);

export const PageHeader: Story = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Title>Schema Registry</Title>
      <Subtitle>Manage your GraphQL schemas and track changes over time</Subtitle>
    </div>
    <div className="h-px bg-neutral-6" />
    <p className="text-neutral-11 text-sm">Page content would go here...</p>
  </div>
);

export const MultipleHeaders: Story = () => (
  <div className="space-y-8 max-w-2xl">
    <div className="space-y-2">
      <Title>Organization Settings</Title>
      <Subtitle>Configure your organization preferences and permissions</Subtitle>
    </div>

    <div className="space-y-2">
      <Title className="text-base">Members</Title>
      <Subtitle>Manage team members and their access levels</Subtitle>
    </div>

    <div className="space-y-2">
      <Title className="text-base">Billing</Title>
      <Subtitle>View and manage your subscription and payment methods</Subtitle>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Page Components</h2>
      <p className="text-neutral-11 mb-4">
        Simple typography components for page headers. Exports Title and Subtitle.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Title</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Title>Page Title Example</Title>
          </div>
          <p className="text-xs text-neutral-10">
            Font size: <code className="text-neutral-12">text-lg</code>
            <br />
            Font weight: <code className="text-neutral-12">font-semibold</code>
            <br />
            Tracking: <code className="text-neutral-12">tracking-tight</code>
            <br />
            Cursor: <code className="text-neutral-12">cursor-default</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Subtitle</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <Subtitle>This is a subtitle that provides additional context</Subtitle>
          </div>
          <p className="text-xs text-neutral-10">
            Font size: <code className="text-neutral-12">text-sm</code>
            <br />
            Color: <code className="text-neutral-12">text-gray-400</code>
            <br />
            Cursor: <code className="text-neutral-12">cursor-default</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Combined (Typical Usage)</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-2">
              <Title>Schema Explorer</Title>
              <Subtitle>Browse and search your GraphQL schema types and fields</Subtitle>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Standard pattern: Title immediately followed by Subtitle with{' '}
            <code className="text-neutral-12">space-y-2</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Custom Styling</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="space-y-2">
              <Title className="text-accent">Custom Colored Title</Title>
              <Subtitle className="text-neutral-11">Custom colored subtitle</Subtitle>
            </div>
          </div>
          <p className="text-xs text-neutral-10">
            Both components accept <code className="text-neutral-12">className</code> prop for
            customization
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage in Codebase</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-neutral-11 text-sm mb-2">Used throughout pages for section headers:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>pages/organization.tsx - Organization overview</li>
          <li>pages/target-laboratory.tsx - Laboratory interface</li>
          <li>pages/target-checks.tsx - Schema check results</li>
          <li>pages/target-proposals.tsx - Schema proposals</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Patterns</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Page Headers</p>
          <p className="text-neutral-10 text-xs">
            Used at the top of pages to introduce the page content and provide context.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Section Headers</p>
          <p className="text-neutral-10 text-xs">
            Can be used with smaller font size (className="text-base") for sub-sections within a
            page.
          </p>
        </div>
      </div>
    </div>
  </div>
);
