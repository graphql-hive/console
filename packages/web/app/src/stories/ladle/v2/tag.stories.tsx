import { Tag } from '@/components/v2/tag';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Tag',
};

export const Default: Story = () => <Tag>Default Tag</Tag>;

export const AllColors: Story = () => (
  <div className="flex flex-wrap gap-3">
    <Tag color="gray">Gray Tag</Tag>
    <Tag color="green">Green Tag</Tag>
    <Tag color="yellow">Yellow Tag</Tag>
    <Tag color="orange">Orange Tag</Tag>
    <Tag color="red">Red Tag</Tag>
  </div>
);

export const WithIcons: Story = () => (
  <div className="flex flex-wrap gap-3">
    <Tag color="green">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Success
    </Tag>
    <Tag color="red">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      Error
    </Tag>
    <Tag color="yellow">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Warning
    </Tag>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Tag Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Simple badge/tag component with predefined color variants. Uses semantic color scheme for
        different states.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Color Variants</h4>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Tag color="gray">Gray Tag</Tag>
          <code className="text-xs">bg-neutral-10/10 text-neutral-10</code>
          <span className="text-neutral-11 text-xs">- Default/neutral state</span>
        </div>
        <div className="flex items-center gap-3">
          <Tag color="green">Green Tag</Tag>
          <code className="text-xs">bg-green-500/10 text-green-500</code>
          <span className="text-neutral-11 text-xs">- Success/active state</span>
        </div>
        <div className="flex items-center gap-3">
          <Tag color="yellow">Yellow Tag</Tag>
          <code className="text-xs">bg-yellow-500/10 text-yellow-500</code>
          <span className="text-neutral-11 text-xs">- Warning state</span>
        </div>
        <div className="flex items-center gap-3">
          <Tag color="orange">Orange Tag</Tag>
          <code className="text-xs">bg-neutral-2/10 text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Accent/highlight state</span>
        </div>
        <div className="flex items-center gap-3">
          <Tag color="red">Red Tag</Tag>
          <code className="text-xs">bg-red-500/10 text-red-500</code>
          <span className="text-neutral-11 text-xs">- Error/danger state</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Tag>Example</Tag>
          <code className="text-xs">inline-flex items-center gap-x-1</code>
          <span className="text-neutral-11 text-xs">- Flexbox layout</span>
        </div>
        <div className="flex items-center gap-3">
          <Tag>Example</Tag>
          <code className="text-xs">rounded-sm p-2</code>
          <span className="text-neutral-11 text-xs">- Border radius and padding</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-neutral-11 text-sm">Status badges:</span>
          <Tag color="green">Published</Tag>
          <Tag color="yellow">Draft</Tag>
          <Tag color="red">Deprecated</Tag>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-11 text-sm">Version tags:</span>
          <Tag color="orange">v2.0</Tag>
          <Tag color="gray">beta</Tag>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Simple span element with inline-flex layout</li>
        <li>Colors use /10 opacity for background with solid text color</li>
        <li>Supports custom className for additional styling</li>
        <li>Children can include icons or text</li>
        <li>gap-x-1 provides spacing between icon and text</li>
      </ul>
    </div>
  </div>
);
