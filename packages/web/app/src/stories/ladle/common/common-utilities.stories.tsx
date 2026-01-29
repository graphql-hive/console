import type { Story } from '@ladle/react';
import { Label, Page, Section, Scale } from '@/components/common';
import { Button } from '@/components/ui/button';

export default {
  title: 'Common / Common Utilities',
};

export const LabelComponent: Story = () => (
  <div className="space-y-4">
    <Label>Default Label</Label>
    <Label>NEW</Label>
    <Label>BETA</Label>
    <Label>DEPRECATED</Label>
  </div>
);

export const PageComponent: Story = () => (
  <div className="h-screen">
    <Page title="Page Title" subtitle="This is a subtitle describing the page">
      <p className="text-neutral-11">Page content goes here</p>
    </Page>
  </div>
);

export const PageWithActions: Story = () => (
  <div className="h-screen">
    <Page
      title="Settings"
      subtitle="Manage your application settings"
      actions={
        <>
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </>
      }
    >
      <p className="text-neutral-11">Page content with action buttons in the header</p>
    </Page>
  </div>
);

export const PageScrollable: Story = () => (
  <div className="h-screen">
    <Page title="Long Content" subtitle="Scrollable page example" scrollable>
      {Array.from({ length: 50 }, (_, i) => (
        <p key={i} className="text-neutral-11 mb-4">
          Paragraph {i + 1}: This is scrollable content. Lorem ipsum dolor sit amet, consectetur
          adipiscing elit.
        </p>
      ))}
    </Page>
  </div>
);

export const PageNoPadding: Story = () => (
  <div className="h-screen">
    <Page title="No Padding" subtitle="Content extends to edges" noPadding>
      <div className="bg-neutral-3 size-full p-8">
        <p className="text-neutral-11">This content has no default padding applied</p>
      </div>
    </Page>
  </div>
);

export const SectionComponents: Story = () => (
  <div className="space-y-6">
    <div>
      <Section.BigTitle>Big Section Title</Section.BigTitle>
      <Section.Subtitle>This is a subtitle for the big section</Section.Subtitle>
      <p className="text-neutral-11 mt-2 text-sm">Section content goes here</p>
    </div>

    <div>
      <Section.Title>Regular Section Title</Section.Title>
      <Section.Subtitle>This is a subtitle for the regular section</Section.Subtitle>
      <p className="text-neutral-11 mt-2 text-sm">Section content goes here</p>
    </div>

    <div>
      <Section.Title>Another Section</Section.Title>
      <p className="text-neutral-11 mt-2 text-sm">
        Section without subtitle, just title and content
      </p>
    </div>
  </div>
);

export const ScaleComponent: Story = () => (
  <div className="space-y-6">
    <div>
      <p className="text-neutral-11 mb-2 text-sm">Value: 0 / Max: 100 (Empty)</p>
      <Scale value={0} max={100} size={10} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Value: 25 / Max: 100</p>
      <Scale value={25} max={100} size={10} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Value: 50 / Max: 100</p>
      <Scale value={50} max={100} size={10} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Value: 75 / Max: 100</p>
      <Scale value={75} max={100} size={10} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Value: 100 / Max: 100 (Full)</p>
      <Scale value={100} max={100} size={10} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Different sizes - 5 bars</p>
      <Scale value={60} max={100} size={5} />
    </div>

    <div>
      <p className="text-neutral-11 mb-2 text-sm">Different sizes - 20 bars</p>
      <Scale value={60} max={100} size={20} />
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Common Utility Components</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Collection of simple utility components: Label (badge), Page (container with header),
        Section (heading components), and Scale (visual indicator).
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Label Component</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 mb-2 text-xs">Yellow badge for status indicators:</p>
        <div className="flex items-center gap-3">
          <code className="text-xs">bg-yellow-50 text-yellow-600</code>
          <span className="text-neutral-11 text-xs">- Background and text colors</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">rounded-sm px-2 py-1</code>
          <span className="text-neutral-11 text-xs">- Shape and padding</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-xs font-medium tracking-widest</code>
          <span className="text-neutral-11 text-xs">- Typography</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Page Component</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactElement;  // Header action buttons
  scrollable?: boolean;    // Enable content scrolling
  noPadding?: boolean;     // Remove default padding
  className?: string;
  children: ReactNode;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Page Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">relative flex h-full flex-col</code>
          <span className="text-neutral-11 text-xs">- Root container</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-neutral-1 text-xl font-bold</code>
          <span className="text-neutral-11 text-xs">- Title styling</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">text-sm text-gray-600</code>
          <span className="text-neutral-11 text-xs">- Subtitle styling</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">px-4 pb-4</code>
          <span className="text-neutral-11 text-xs">- Content padding (when not noPadding)</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">grow overflow-y-auto</code>
          <span className="text-neutral-11 text-xs">- Scrollable content (when scrollable)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Section Components</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Section.BigTitle:</p>
          <code className="text-xs">text-neutral-1 text-base font-bold</code>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Section.Title:</p>
          <code className="text-xs">text-neutral-1 text-base font-bold</code>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-xs font-medium">Section.Subtitle:</p>
          <code className="text-xs">text-sm text-gray-600</code>
        </div>
        <div>
          <p className="text-neutral-10 text-xs">
            Note: BigTitle and Title use same styling, rendered as h2 and h3 respectively
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Scale Component</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface ScaleProps {
  value: number;   // Current value
  max: number;     // Maximum value
  size: number;    // Number of bars to display
  className?: string;
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Scale Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-400 h-4 w-4" />
          <code className="text-xs">bg-emerald-400</code>
          <span className="text-neutral-11 text-xs">- Filled bars (active)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-neutral-10 h-4 w-4" />
          <code className="text-xs">bg-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Empty bars (inactive)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Scale Layout</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">flex grow-0 flex-row space-x-1</code>
          <span className="text-neutral-11 text-xs">- Container with gap between bars</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">h-4 w-1</code>
          <span className="text-neutral-11 text-xs">- Individual bar dimensions</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Label: Simple span with yellow background for status badges</li>
        <li>Page: Full page container with optional header actions and scrolling</li>
        <li>Section: Composed heading components for consistent section styling</li>
        <li>Scale: Visual indicator showing fill percentage with configurable bar count</li>
        <li>All components accept className for customization via cn() utility</li>
        <li>Scale calculation: value &gt;= i * (max / size) determines filled bars</li>
      </ul>
    </div>
  </div>
);
