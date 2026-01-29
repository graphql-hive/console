import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Resizable',
};

export const HorizontalPanels: Story = () => (
  <ResizablePanelGroup direction="horizontal" className="min-h-[400px] rounded-lg border">
    <ResizablePanel defaultSize={50}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Left Panel</span>
      </div>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={50}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Right Panel</span>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const WithHandle: Story = () => (
  <ResizablePanelGroup direction="horizontal" className="min-h-[400px] rounded-lg border">
    <ResizablePanel defaultSize={40}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Sidebar</span>
      </div>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={60}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Main Content</span>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const ThreePanels: Story = () => (
  <ResizablePanelGroup direction="horizontal" className="min-h-[400px] rounded-lg border">
    <ResizablePanel defaultSize={25} minSize={15}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Left</span>
      </div>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={50}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Center</span>
      </div>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={25} minSize={15}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Right</span>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const VerticalPanels: Story = () => (
  <ResizablePanelGroup direction="vertical" className="min-h-[400px] rounded-lg border">
    <ResizablePanel defaultSize={50}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Top Panel</span>
      </div>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={50}>
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-neutral-11 font-semibold">Bottom Panel</span>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const EditorLayout: Story = () => (
  <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border">
    <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
      <div className="h-full p-4">
        <h3 className="text-neutral-12 mb-4 font-semibold">Files</h3>
        <div className="space-y-2">
          <div className="text-neutral-11 text-sm">📄 schema.graphql</div>
          <div className="text-neutral-11 text-sm">📄 resolvers.ts</div>
          <div className="text-neutral-11 text-sm">📄 index.ts</div>
        </div>
      </div>
    </ResizablePanel>
    <ResizableHandle />
    <ResizablePanel defaultSize={80}>
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={70}>
          <div className="h-full p-4">
            <h3 className="text-neutral-12 mb-4 font-semibold">Editor</h3>
            <pre className="text-neutral-11 bg-neutral-1 rounded-sm p-4 text-sm">
              {`type Query {
  user(id: ID!): User
  users: [User!]!
}`}
            </pre>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="h-full p-4">
            <h3 className="text-neutral-12 mb-2 font-semibold">Terminal</h3>
            <div className="text-neutral-11 bg-neutral-1 rounded-sm p-4 font-mono text-sm">
              $ hive schema:publish
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 max-w-6xl space-y-8 rounded-lg p-8">
    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Resizable Component</h2>
      <p className="text-neutral-11 mb-4">
        Resizable panel groups built with react-resizable-panels. Create split panes that users can
        resize.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Horizontal</p>
          <ResizablePanelGroup direction="horizontal" className="min-h-[200px] rounded-lg border">
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <span className="text-neutral-11 text-sm">Panel 1</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full items-center justify-center">
                <span className="text-neutral-11 text-sm">Panel 2</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <p className="text-neutral-10 text-xs">
            Direction: <code className="text-neutral-12">horizontal</code>
            <br />
            Handle: <code className="text-neutral-12">bg-border w-px</code>
            <br />
            Drag the handle to resize panels
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">With Drag Handle</p>
          <ResizablePanelGroup direction="horizontal" className="min-h-[200px] rounded-lg border">
            <ResizablePanel defaultSize={40}>
              <div className="flex h-full items-center justify-center">
                <span className="text-neutral-11 text-sm">Panel 1</span>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60}>
              <div className="flex h-full items-center justify-center">
                <span className="text-neutral-11 text-sm">Panel 2</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <p className="text-neutral-10 text-xs">
            Handle with grip icon: <code className="text-neutral-12">withHandle</code> prop
            <br />
            Icon: <code className="text-neutral-12">GripVertical</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Structure</h2>
      <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
        <ul className="text-neutral-11 space-y-1 text-sm">
          <li>
            <code className="text-neutral-12">ResizablePanelGroup</code>: Container for resizable
            panels
            <br />
            <span className="text-neutral-10 text-xs">
              Props: direction ("horizontal" | "vertical")
            </span>
          </li>
          <li>
            <code className="text-neutral-12">ResizablePanel</code>: Individual panel
            <br />
            <span className="text-neutral-10 text-xs">
              Props: defaultSize, minSize, maxSize (percentages)
            </span>
          </li>
          <li>
            <code className="text-neutral-12">ResizableHandle</code>: Draggable resize handle
            <br />
            <span className="text-neutral-10 text-xs">Props: withHandle (shows grip icon)</span>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
      <div className="space-y-2">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">ResizablePanel</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">defaultSize</code>: Initial size (0-100)
            </li>
            <li>
              <code className="text-neutral-12">minSize</code>: Minimum size (optional)
            </li>
            <li>
              <code className="text-neutral-12">maxSize</code>: Maximum size (optional)
            </li>
          </ul>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">ResizableHandle</p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">withHandle</code>: Show grip icon (boolean)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Code Editors</p>
          <p className="text-neutral-10 text-xs">
            Split view for file explorer + editor, or editor + preview pane.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Dashboards</p>
          <p className="text-neutral-10 text-xs">
            Resizable widgets and panels for customizable layouts.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Developer Tools</p>
          <p className="text-neutral-10 text-xs">
            Console, debugger, and output panes that users can resize to their preference.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 mb-4 text-xl font-bold">Features</h2>
      <div className="space-y-4">
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Nested Groups</p>
          <p className="text-neutral-10 text-xs">
            ResizablePanelGroups can be nested for complex layouts (horizontal inside vertical, or
            vice versa).
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Keyboard Accessible</p>
          <p className="text-neutral-10 text-xs">
            Handles can be focused and resized using keyboard arrow keys.
          </p>
        </div>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-11 mb-2 text-sm font-medium">Constraints</p>
          <p className="text-neutral-10 text-xs">
            Min/max size constraints prevent panels from becoming too small or large.
          </p>
        </div>
      </div>
    </div>
  </div>
);
