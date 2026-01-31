import {
  ListNavigationProvider,
  ListNavigationTrigger,
  ListNavigationWrapper,
} from '@/components/common/ListNavigation';
import type { Story } from '@ladle/react';

export default {
  title: 'Common / List Navigation',
};

export const Default: Story = () => (
  <ListNavigationProvider isCollapsed={true} isHidden={false}>
    <div className="h-screen w-full">
      <ListNavigationWrapper
        list={
          <div className="bg-neutral-3 border-neutral-6 h-full border-r p-4">
            <h3 className="text-neutral-12 mb-4 font-semibold">Navigation List</h3>
            <ul className="text-neutral-11 space-y-2 text-sm">
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
              <li>Item 4</li>
            </ul>
          </div>
        }
        content={
          <div className="flex size-full flex-col p-6">
            <div className="mb-4">
              <ListNavigationTrigger />
            </div>
            <h2 className="text-neutral-12 mb-4 text-2xl font-bold">Content Area</h2>
            <p className="text-neutral-11">
              Click the hamburger menu to toggle the navigation list visibility.
            </p>
          </div>
        }
      />
    </div>
  </ListNavigationProvider>
);

export const WithCustomTrigger: Story = () => (
  <ListNavigationProvider isCollapsed={true} isHidden={false}>
    <div className="h-screen w-full">
      <ListNavigationWrapper
        list={
          <div className="bg-neutral-3 border-neutral-6 h-full border-r p-4">
            <h3 className="text-neutral-12 mb-4 font-semibold">Project List</h3>
            <ul className="text-neutral-11 space-y-2 text-sm">
              <li className="hover:text-neutral-12 cursor-pointer">My API Project</li>
              <li className="hover:text-neutral-12 cursor-pointer">Frontend App</li>
              <li className="hover:text-neutral-12 cursor-pointer">Mobile Backend</li>
            </ul>
          </div>
        }
        content={
          <div className="flex size-full flex-col p-6">
            <div className="mb-4">
              <ListNavigationTrigger>Toggle Sidebar</ListNavigationTrigger>
            </div>
            <h2 className="text-neutral-12 mb-4 text-2xl font-bold">Project Details</h2>
            <p className="text-neutral-11">Custom trigger button with text label.</p>
          </div>
        }
      />
    </div>
  </ListNavigationProvider>
);

export const InitiallyHidden: Story = () => (
  <ListNavigationProvider isCollapsed={true} isHidden={true}>
    <div className="h-screen w-full">
      <ListNavigationWrapper
        list={
          <div className="bg-neutral-3 border-neutral-6 h-full border-r p-4">
            <h3 className="text-neutral-12 mb-4 font-semibold">Hidden by Default</h3>
            <ul className="text-neutral-11 space-y-2 text-sm">
              <li>Item A</li>
              <li>Item B</li>
              <li>Item C</li>
            </ul>
          </div>
        }
        content={
          <div className="flex size-full flex-col p-6">
            <div className="mb-4">
              <ListNavigationTrigger />
            </div>
            <h2 className="text-neutral-12 mb-4 text-2xl font-bold">Full Width Content</h2>
            <p className="text-neutral-11">
              Navigation is initially hidden. Click the menu to reveal it.
            </p>
          </div>
        }
      />
    </div>
  </ListNavigationProvider>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Common List Navigation Component
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Context-based responsive sidebar navigation with collapse/hide states. Uses
        HamburgerMenuIcon toggle button and responsive visibility classes.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Context State Management</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`type ListNavigationContextType = {
  isListNavCollapsed: boolean;
  setIsListNavCollapsed: (collapsed: boolean) => void;
  isListNavHidden: boolean;
  setIsListNavHidden: (hidden: boolean) => void;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>ListNavigationProvider - Context provider with initial collapsed/hidden state</li>
        <li>ListNavigationTrigger - Toggle button (HamburgerMenuIcon or custom children)</li>
        <li>ListNavigationWrapper - Layout wrapper for list + content areas</li>
        <li>ListNavigation - Sidebar container with responsive visibility</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Custom Hooks</h4>
      <div className="space-y-2">
        <div>
          <code className="text-xs">useListNavCollapsedToggle()</code>
          <p className="text-neutral-10 mt-1 text-xs">
            Returns [isCollapsed, toggle] - Simple toggle for collapsed state
          </p>
        </div>
        <div>
          <code className="text-xs">useListNavHiddenToggle()</code>
          <p className="text-neutral-10 mt-1 text-xs">
            Returns [isHidden, toggle] - Smart toggle that expands if collapsed before hiding
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Responsive Behavior</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Mobile: Shows list OR content (toggle between them)</li>
        <li>Desktop (md+): Can show both list and content side-by-side</li>
        <li>Collapsed state: List width is 20% with min-width 300px (md) or 420px (xl)</li>
        <li>Hidden state: List completely hidden, content takes full width</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">w-[20%] md:min-w-[300px] xl:min-w-[420px]</code>
          <span className="text-neutral-11 text-xs">- List width when collapsed</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">sticky inset-y-0 max-h-screen overflow-y-auto</code>
          <span className="text-neutral-11 text-xs">- List scroll container</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">relative flex grow flex-row</code>
          <span className="text-neutral-11 text-xs">- Wrapper layout</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Trigger Button</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">MenuButton (default):</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Ghost variant Button with HamburgerMenuIcon</li>
            <li>Padding: p-[10px]</li>
          </ul>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Custom trigger:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Pass children to ListNavigationTrigger</li>
            <li>Renders as Button with custom content</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses React Context for state management</li>
        <li>Responsive visibility with Tailwind breakpoints (md, xl)</li>
        <li>Sticky positioning for scrollable list navigation</li>
        <li>Smart toggle logic: expands collapsed nav before hiding</li>
        <li>All-or-nothing on small screens for better UX</li>
        <li>Absolute + sticky positioning for proper scroll behavior</li>
      </ul>
    </div>
  </div>
);
