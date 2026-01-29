import { Button } from '@/components/ui/button';
import {
  NavLayout,
  PageLayout,
  PageLayoutContent,
  SubPageLayout,
  SubPageLayoutHeader,
} from '@/components/ui/page-content-layout';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Page Content Layout',
};

export const BasicLayout: Story = () => (
  <PageLayout>
    <NavLayout>
      <Button variant="ghost" className="justify-start">
        Overview
      </Button>
      <Button variant="ghost" className="justify-start">
        Settings
      </Button>
      <Button variant="ghost" className="justify-start">
        Members
      </Button>
    </NavLayout>
    <PageLayoutContent mainTitlePage="Dashboard">
      <p className="text-neutral-11 text-sm">Main content area goes here.</p>
    </PageLayoutContent>
  </PageLayout>
);

export const WithSubPages: Story = () => (
  <PageLayout>
    <NavLayout>
      <Button variant="ghost" className="justify-start">
        General
      </Button>
      <Button variant="ghost" className="justify-start">
        Security
      </Button>
      <Button variant="ghost" className="justify-start">
        Billing
      </Button>
    </NavLayout>
    <PageLayoutContent>
      <SubPageLayout>
        <SubPageLayoutHeader
          subPageTitle="Organization Settings"
          description="Manage your organization preferences and configuration"
        />
        <div className="space-y-4">
          <p className="text-neutral-11 text-sm">Settings content goes here...</p>
        </div>
      </SubPageLayout>
    </PageLayoutContent>
  </PageLayout>
);

export const WithHeaderActions: Story = () => (
  <PageLayout>
    <NavLayout>
      <Button variant="ghost" className="justify-start">
        All Tokens
      </Button>
      <Button variant="ghost" className="justify-start">
        Personal
      </Button>
      <Button variant="ghost" className="justify-start">
        Organization
      </Button>
    </NavLayout>
    <PageLayoutContent>
      <SubPageLayout>
        <SubPageLayoutHeader
          subPageTitle="Access Tokens"
          description="Manage API access tokens for your services"
        >
          <Button>Create Token</Button>
        </SubPageLayoutHeader>
        <div className="space-y-4">
          <p className="text-neutral-11 text-sm">Token list would appear here...</p>
        </div>
      </SubPageLayout>
    </PageLayoutContent>
  </PageLayout>
);

export const MultipleSubPages: Story = () => (
  <PageLayout>
    <NavLayout>
      <Button variant="ghost" className="justify-start">
        Profile
      </Button>
      <Button variant="ghost" className="justify-start">
        Notifications
      </Button>
      <Button variant="ghost" className="justify-start">
        Security
      </Button>
    </NavLayout>
    <PageLayoutContent>
      <div className="space-y-8">
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Profile Information"
            description="Update your personal information and avatar"
          />
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm">Name: Alice Johnson</p>
            <p className="text-neutral-11 text-sm">Email: alice@example.com</p>
          </div>
        </SubPageLayout>

        <SubPageLayout>
          <SubPageLayoutHeader subPageTitle="Password" description="Change your account password" />
          <div className="space-y-2">
            <Button variant="outline">Change Password</Button>
          </div>
        </SubPageLayout>
      </div>
    </PageLayoutContent>
  </PageLayout>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-6xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Page Content Layout Components</h2>
      <p className="text-neutral-11 mb-4">
        Layout system for pages with side navigation and content areas. Creates consistent
        two-column layouts.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Complete Layout</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <PageLayout>
              <NavLayout>
                <Button variant="ghost" size="sm" className="justify-start">
                  Item 1
                </Button>
                <Button variant="ghost" size="sm" className="justify-start">
                  Item 2
                </Button>
              </NavLayout>
              <PageLayoutContent mainTitlePage="Page Title">
                <p className="text-neutral-11 text-sm">Content</p>
              </PageLayoutContent>
            </PageLayout>
          </div>
          <p className="text-neutral-10 text-xs">
            Typical pattern: PageLayout &gt; NavLayout + PageLayoutContent
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">NavLayout (Side Navigation)</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <NavLayout>
              <Button variant="ghost" size="sm" className="justify-start">
                Navigation Item 1
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                Navigation Item 2
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                Navigation Item 3
              </Button>
            </NavLayout>
          </div>
          <p className="text-neutral-10 text-xs">
            Width: <code className="text-neutral-12">w-48</code>
            <br />
            Layout: <code className="text-neutral-12">flex flex-col</code>
            <br />
            Spacing: <code className="text-neutral-12">space-y-1</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">SubPageLayoutHeader</p>
          <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
            <SubPageLayoutHeader
              subPageTitle="Section Title"
              description="Section description text"
            >
              <Button size="sm">Action</Button>
            </SubPageLayoutHeader>
          </div>
          <p className="text-neutral-10 text-xs">
            Renders CardTitle and CardDescription
            <br />
            Optional children (actions) on the right
            <br />
            Layout: <code className="text-neutral-12">flex justify-between</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Components</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-2 text-sm">
          <li>
            <code className="text-neutral-12">PageLayout</code>: Root container with flex layout and
            padding
          </li>
          <li>
            <code className="text-neutral-12">NavLayout</code>: Side navigation column (w-48)
          </li>
          <li>
            <code className="text-neutral-12">PageLayoutContent</code>: Main content area (grows to
            fill space)
            <br />
            <span className="text-neutral-10 text-xs">
              Optional mainTitlePage prop for page title with divider
            </span>
          </li>
          <li>
            <code className="text-neutral-12">SubPageLayout</code>: Section container with vertical
            spacing
          </li>
          <li>
            <code className="text-neutral-12">SubPageLayoutHeader</code>: Section header with title,
            description, and optional actions
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage Pattern</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <pre className="text-neutral-10 overflow-x-auto text-xs">
          {`<PageLayout>
  <NavLayout>
    <Button>Nav Item 1</Button>
    <Button>Nav Item 2</Button>
  </NavLayout>
  <PageLayoutContent mainTitlePage="Page Title">
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Section"
        description="Description"
      >
        <Button>Action</Button>
      </SubPageLayoutHeader>
      {/* Content */}
    </SubPageLayout>
  </PageLayoutContent>
</PageLayout>`}
        </pre>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Settings Pages</p>
          <p className="text-neutral-10 text-xs">
            Left navigation for settings categories, right content for settings forms and options.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Documentation</p>
          <p className="text-neutral-10 text-xs">
            Table of contents in NavLayout, article content in PageLayoutContent.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Multi-Section Pages</p>
          <p className="text-neutral-10 text-xs">
            Each SubPageLayout represents a distinct section with its own header and content.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Usage in Codebase</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-10 space-y-1 text-xs">
          <li>pages/target-proposals.tsx - Proposals with side navigation</li>
          <li>pages/target-traces.tsx - Traces with filters</li>
          <li>components/target/proposals/editor.tsx - Proposal editor layout</li>
        </ul>
      </div>
    </div>
  </div>
);
