import type { Story } from '@ladle/react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

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
            <pre className="text-neutral-11 bg-neutral-1 rounded p-4 text-sm">
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
            <div className="text-neutral-11 bg-neutral-1 rounded p-4 text-sm font-mono">
              $ hive schema:publish
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </ResizablePanel>
  </ResizablePanelGroup>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-6xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Resizable Component</h2>
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
          <p className="text-xs text-neutral-10">
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
          <p className="text-xs text-neutral-10">
            Handle with grip icon: <code className="text-neutral-12">withHandle</code> prop
            <br />
            Icon: <code className="text-neutral-12">GripVertical</code>
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Structure</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-sm space-y-1 text-neutral-11">
          <li>
            <code className="text-neutral-12">ResizablePanelGroup</code>: Container for resizable
            panels
            <br />
            <span className="text-xs text-neutral-10">
              Props: direction ("horizontal" | "vertical")
            </span>
          </li>
          <li>
            <code className="text-neutral-12">ResizablePanel</code>: Individual panel
            <br />
            <span className="text-xs text-neutral-10">
              Props: defaultSize, minSize, maxSize (percentages)
            </span>
          </li>
          <li>
            <code className="text-neutral-12">ResizableHandle</code>: Draggable resize handle
            <br />
            <span className="text-xs text-neutral-10">Props: withHandle (shows grip icon)</span>
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
      <div className="space-y-2">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ResizablePanel</p>
          <ul className="text-xs space-y-1 text-neutral-10">
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
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ResizableHandle</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">withHandle</code>: Show grip icon (boolean)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Code Editors</p>
          <p className="text-neutral-10 text-xs">
            Split view for file explorer + editor, or editor + preview pane.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Dashboards</p>
          <p className="text-neutral-10 text-xs">
            Resizable widgets and panels for customizable layouts.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Developer Tools</p>
          <p className="text-neutral-10 text-xs">
            Console, debugger, and output panes that users can resize to their preference.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Features</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Nested Groups</p>
          <p className="text-neutral-10 text-xs">
            ResizablePanelGroups can be nested for complex layouts (horizontal inside vertical, or
            vice versa).
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Keyboard Accessible</p>
          <p className="text-neutral-10 text-xs">
            Handles can be focused and resized using keyboard arrow keys.
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Constraints</p>
          <p className="text-neutral-10 text-xs">
            Min/max size constraints prevent panels from becoming too small or large.
          </p>
        </div>
      </div>
    </div>
  </div>
);
