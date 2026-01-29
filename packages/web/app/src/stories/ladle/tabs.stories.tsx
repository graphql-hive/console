import type { Story } from "@ladle/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
      <div className="p-4 text-neutral-11">Overview content</div>
    </TabsContent>
    <TabsContent variant="menu" value="schema">
      <div className="p-4 text-neutral-11">Schema content</div>
    </TabsContent>
    <TabsContent variant="menu" value="operations">
      <div className="p-4 text-neutral-11">Operations content</div>
    </TabsContent>
    <TabsContent variant="menu" value="settings">
      <div className="p-4 text-neutral-11">Settings content</div>
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
      <div className="p-4 bg-neutral-2 rounded text-neutral-11">
        Code editor content goes here
      </div>
    </TabsContent>
    <TabsContent variant="content" value="preview">
      <div className="p-4 bg-neutral-2 rounded text-neutral-11">
        Preview content goes here
      </div>
    </TabsContent>
    <TabsContent variant="content" value="docs">
      <div className="p-4 bg-neutral-2 rounded text-neutral-11">
        Documentation goes here
      </div>
    </TabsContent>
  </Tabs>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-1 max-w-4xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Tab Variants
      </h2>

      <div className="space-y-8">
        <div>
          <p className="text-neutral-11 text-sm font-medium mb-3">
            Default (bg-muted with neutral colors)
          </p>
          <Tabs defaultValue="tab1" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="tab1">Active Tab</TabsTrigger>
              <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
              <TabsTrigger value="tab3">Another Tab</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <div className="p-4 bg-neutral-2 rounded text-neutral-11">
                Active tab content (data-[state=active]:bg-neutral-3)
              </div>
            </TabsContent>
            <TabsContent value="tab2">Content 2</TabsContent>
            <TabsContent value="tab3">Content 3</TabsContent>
          </Tabs>
        </div>

        <div>
          <p className="text-neutral-11 text-sm font-medium mb-3">
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
              <div className="p-4 text-neutral-11">
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
          <p className="text-neutral-11 text-sm font-medium mb-3">
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
              <div className="p-4 bg-neutral-2 rounded text-neutral-11">
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
      <h2 className="text-neutral-12 text-xl font-bold mb-4">
        Interactive Example
      </h2>
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
          <div className="p-6 bg-neutral-2 rounded">
            <h3 className="text-neutral-12 font-semibold mb-2">
              Profile Settings
            </h3>
            <p className="text-neutral-11 text-sm">
              Manage your profile information and preferences.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="security">
          <div className="p-6 bg-neutral-2 rounded">
            <h3 className="text-neutral-12 font-semibold mb-2">
              Security Settings
            </h3>
            <p className="text-neutral-11 text-sm">
              Configure password, 2FA, and other security options.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="billing">
          <div className="p-6 bg-neutral-2 rounded">
            <h3 className="text-neutral-12 font-semibold mb-2">
              Billing Settings
            </h3>
            <p className="text-neutral-11 text-sm">
              View your subscription and payment information.
            </p>
          </div>
        </TabsContent>
        <TabsContent variant="menu" value="notifications">
          <div className="p-6 bg-neutral-2 rounded">
            <h3 className="text-neutral-12 font-semibold mb-2">
              Notification Settings
            </h3>
            <p className="text-neutral-11 text-sm">
              Control email and push notification preferences.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);
