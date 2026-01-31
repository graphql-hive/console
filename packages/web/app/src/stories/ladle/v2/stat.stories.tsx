import Stat from '@/components/v2/stat';
import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Stat',
};

export const Default: Story = () => (
  <Stat>
    <Stat.Label>Total Users</Stat.Label>
    <Stat.Number>12,345</Stat.Number>
  </Stat>
);

export const WithHelpText: Story = () => (
  <Stat>
    <Stat.Label>Monthly Revenue</Stat.Label>
    <Stat.Number>$45,231</Stat.Number>
    <Stat.HelpText>+12% from last month</Stat.HelpText>
  </Stat>
);

export const MultipleStats: Story = () => (
  <div className="grid grid-cols-3 gap-6">
    <Stat>
      <Stat.Label>Total Projects</Stat.Label>
      <Stat.Number>24</Stat.Number>
      <Stat.HelpText>Across all organizations</Stat.HelpText>
    </Stat>
    <Stat>
      <Stat.Label>API Calls</Stat.Label>
      <Stat.Number>1.2M</Stat.Number>
      <Stat.HelpText>Last 30 days</Stat.HelpText>
    </Stat>
    <Stat>
      <Stat.Label>Uptime</Stat.Label>
      <Stat.Number>99.9%</Stat.Number>
      <Stat.HelpText>This month</Stat.HelpText>
    </Stat>
  </div>
);

export const CustomColors: Story = () => (
  <div className="space-y-6">
    <Stat>
      <Stat.Label className="text-green-500">Active Users</Stat.Label>
      <Stat.Number className="text-green-500">8,432</Stat.Number>
      <Stat.HelpText>Currently online</Stat.HelpText>
    </Stat>
    <Stat>
      <Stat.Label className="text-red-500">Failed Requests</Stat.Label>
      <Stat.Number className="text-red-500">127</Stat.Number>
      <Stat.HelpText>Last hour</Stat.HelpText>
    </Stat>
  </div>
);

export const DashboardExample: Story = () => (
  <div className="border-neutral-6 bg-neutral-1 rounded-lg border p-6">
    <h3 className="text-neutral-12 mb-6 text-lg font-semibold">Analytics Overview</h3>
    <div className="grid grid-cols-4 gap-6">
      <Stat>
        <Stat.Label>Schemas</Stat.Label>
        <Stat.Number>156</Stat.Number>
      </Stat>
      <Stat>
        <Stat.Label>Operations</Stat.Label>
        <Stat.Number>45.2K</Stat.Number>
        <Stat.HelpText>Today</Stat.HelpText>
      </Stat>
      <Stat>
        <Stat.Label>Errors</Stat.Label>
        <Stat.Number>23</Stat.Number>
        <Stat.HelpText>0.05% rate</Stat.HelpText>
      </Stat>
      <Stat>
        <Stat.Label>Avg Latency</Stat.Label>
        <Stat.Number>124ms</Stat.Number>
        <Stat.HelpText>-8ms</Stat.HelpText>
      </Stat>
    </div>
  </div>
);

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Stat Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Semantic statistics display component using HTML description list elements (dl, dt, dd).
        Composed of Label, Number, and optional HelpText subcomponents.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Text Colors (Default)</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Stat.Label>Label</Stat.Label>
          <code className="text-xs">text-sm font-medium</code>
          <span className="text-neutral-11 text-xs">- Label styling (inherits color)</span>
        </div>
        <div className="flex items-center gap-3">
          <Stat.Number>12,345</Stat.Number>
          <code className="text-xs">text-2xl font-semibold</code>
          <span className="text-neutral-11 text-xs">- Number styling (inherits color)</span>
        </div>
        <div className="flex items-center gap-3">
          <Stat.HelpText>Help text</Stat.HelpText>
          <code className="text-xs">text-sm opacity-80</code>
          <span className="text-neutral-11 text-xs">- Help text (inherits color, 80% opacity)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">leading-6</code>
          <span className="text-neutral-11 text-xs">- Root container line height</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Semantic HTML</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Uses proper description list semantics:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">&lt;dl&gt;</code> - Root container (Stat)
            </li>
            <li>
              <code className="text-neutral-12">&lt;dt&gt;</code> - Term/Label (Stat.Label)
            </li>
            <li>
              <code className="text-neutral-12">&lt;dd&gt;</code> - Definition/Value (Stat.Number,
              Stat.HelpText)
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Composition Pattern</h4>
      <div className="space-y-2">
        <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
          {`<Stat>
  <Stat.Label>Label Text</Stat.Label>
  <Stat.Number>123</Stat.Number>
  <Stat.HelpText>Optional help text</Stat.HelpText>
</Stat>`}
        </pre>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Examples</h4>
      <div className="grid grid-cols-2 gap-4">
        <Stat>
          <Stat.Label>Simple stat</Stat.Label>
          <Stat.Number>42</Stat.Number>
        </Stat>
        <Stat>
          <Stat.Label>With context</Stat.Label>
          <Stat.Number>$1,234</Stat.Number>
          <Stat.HelpText>USD</Stat.HelpText>
        </Stat>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Each subcomponent accepts ComponentProps for its HTML element</li>
        <li>All subcomponents support className for customization</li>
        <li>Uses Object.assign pattern to attach subcomponents as static properties</li>
        <li>No default colors - inherits from parent for flexibility</li>
        <li>Minimal styling allows easy customization</li>
        <li>Accessible and semantic HTML structure</li>
      </ul>
    </div>
  </div>
);
