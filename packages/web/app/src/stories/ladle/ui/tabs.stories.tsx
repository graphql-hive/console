import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Tabs',
};

export const Default: Story = () => (
  <Tabs defaultValue="tab1" className="w-[400px]">
    <TabsList>
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      <TabsTrigger value="tab3">Tab 3</TabsTrigger>
    </TabsList>
    <TabsContent value="tab1">Content for Tab 1</TabsContent>
    <TabsContent value="tab2">Content for Tab 2</TabsContent>
    <TabsContent value="tab3">Content for Tab 3</TabsContent>
  </Tabs>
);

export const MenuVariant: Story = () => (
  <Tabs defaultValue="overview" className="w-full">
    <TabsList variant="menu">
      <TabsTrigger variant="menu" value="overview">
        Overview
      </TabsTrigger>
      <TabsTrigger variant="menu" value="schema">
        Schema
      </TabsTrigger>
      <TabsTrigger variant="menu" value="operations">
        Operations
      </TabsTrigger>
      <TabsTrigger variant="menu" value="settings">
        Settings
      </TabsTrigger>
    </TabsList>
    <TabsContent variant="menu" value="overview">
      <div className="text-neutral-11 p-4">Overview content</div>
    </TabsContent>
    <TabsContent variant="menu" value="schema">
      <div className="text-neutral-11 p-4">Schema content</div>
    </TabsContent>
    <TabsContent variant="menu" value="operations">
      <div className="text-neutral-11 p-4">Operations content</div>
    </TabsContent>
    <TabsContent variant="menu" value="settings">
      <div className="text-neutral-11 p-4">Settings content</div>
    </TabsContent>
  </Tabs>
);

export const ContentVariant: Story = () => (
  <Tabs defaultValue="code" className="w-full">
    <TabsList variant="content">
      <TabsTrigger variant="content" value="code">
        Code
      </TabsTrigger>
      <TabsTrigger variant="content" value="preview">
        Preview
      </TabsTrigger>
      <TabsTrigger variant="content" value="docs">
        Docs
      </TabsTrigger>
    </TabsList>
    <TabsContent variant="content" value="code">
      <div className="bg-neutral-2 text-neutral-11 rounded-sm p-4">
        Code editor content goes here
      </div>
    </TabsContent>
    <TabsContent variant="content" value="preview">
      <div className="bg-neutral-2 text-neutral-11 rounded-sm p-4">Preview content goes here</div>
    </TabsContent>
    <TabsContent variant="content" value="docs">
      <div className="bg-neutral-2 text-neutral-11 rounded-sm p-4">Documentation goes here</div>
    </TabsContent>
  </Tabs>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-1 max-w-4xl space-y-8 p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Tab Variants</h2>

      <div className="space-y-8">
        <div>
          <p className="text-neutral-11 mb-3 text-sm font-medium">
            Default (bg-neutral-3 with neutral colors)
          </p>
          <Tabs defaultValue="tab1" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="tab1">Active Tab</TabsTrigger>
              <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
              <TabsTrigger value="tab3">Another Tab</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <div className="bg-neutral-2 text-neutral-11 rounded-sm p-4">
                Active tab content (data-[state=active]:bg-neutral-3)
              </div>
            </TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
            <TabsContent value="tab3">Content 3</TabsContent>
          </Tabs>
        </div>

        <div>
          <p className="text-neutral-11 mb-3 text-sm font-medium">
            Menu variant (border-b-accent when active)
          </p>
          <Tabs defaultValue="active" className="w-full">
            <TabsList variant="menu">
              <TabsTrigger variant="menu" value="active">
                Active Menu Item
              </TabsTrigger>
              <TabsTrigger variant="menu" value="inactive">
                Inactive Menu Item
              </TabsTrigger>
              <TabsTrigger variant="menu" value="another">
                Another Item
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="menu" value="active">
              <div className="text-neutral-11 p-4">
                Menu tabs use border-b-accent for active state
              </div>
            </TabsContent>
            <TabsContent variant="menu" value="inactive">
              Content 2
            </TabsContent>
            <TabsContent variant="menu" value="another">
              Content 3
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <p className="text-neutral-11 mb-3 text-sm font-medium">
            Content variant (data-[state=active]:text-accent)
          </p>
          <Tabs defaultValue="code" className="w-full">
            <TabsList variant="content">
              <TabsTrigger variant="content" value="code">
                Code
              </TabsTrigger>
              <TabsTrigger variant="content" value="preview">
                Preview
              </TabsTrigger>
              <TabsTrigger variant="content" value="result">
                Result
              </TabsTrigger>
            </TabsList>
            <TabsContent variant="content" value="code">
              <div className="bg-neutral-2 text-neutral-11 rounded-sm p-4">
                Active tab text uses accent color
              </div>
            </TabsContent>
            <TabsContent variant="content" value="preview">
              Content 2
            </TabsContent>
            <TabsContent variant="content" value="result">
              Content 3
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Interactive Example</h2>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList variant="menu">
          <TabsTrigger variant="menu" value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger variant="menu" value="security">
            Security
          </TabsTrigger>
          <TabsTrigger variant="menu" value="billing">
            Billing
          </TabsTrigger>
          <TabsTrigger variant="menu" value="notifications">
            Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent variant="menu" value="profile">
          <div className="bg-neutral-2 rounded-sm p-6">
            <h3 className="text-neutral-12 mb-2 font-semibold">Profile Settings</h3>
            <p className="text-neutral-11 text-sm">
              Manage your profile information and preferences.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="security">
          <div className="bg-neutral-2 rounded-sm p-6">
            <h3 className="text-neutral-12 mb-2 font-semibold">Security Settings</h3>
            <p className="text-neutral-11 text-sm">
              Configure password, 2FA, and other security options.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="billing">
          <div className="bg-neutral-2 rounded-sm p-6">
            <h3 className="text-neutral-12 mb-2 font-semibold">Billing Settings</h3>
            <p className="text-neutral-11 text-sm">
              View your subscription and payment information.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="notifications">
          <div className="bg-neutral-2 rounded-sm p-6">
            <h3 className="text-neutral-12 mb-2 font-semibold">Notification Settings</h3>
            <p className="text-neutral-11 text-sm">
              Control email and push notification preferences.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);
