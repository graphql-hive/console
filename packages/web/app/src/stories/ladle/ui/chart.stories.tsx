import type { Story } from '@ladle/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  ok: {
    label: 'Successful',
    color: 'hsl(var(--chart-1))',
  },
  error: {
    label: 'Failed',
    color: 'hsl(var(--chart-2))',
  },
  remaining: {
    label: 'Remaining',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

const trafficData = [
  { time: '00:00', ok: 120, error: 5, remaining: 25 },
  { time: '04:00', ok: 200, error: 8, remaining: 40 },
  { time: '08:00', ok: 350, error: 15, remaining: 60 },
  { time: '12:00', ok: 450, error: 25, remaining: 80 },
  { time: '16:00', ok: 380, error: 18, remaining: 55 },
  { time: '20:00', ok: 280, error: 12, remaining: 45 },
];

const simpleChartConfig = {
  operations: {
    label: 'Operations',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const simpleData = [
  { month: 'Jan', operations: 150 },
  { month: 'Feb', operations: 180 },
  { month: 'Mar', operations: 220 },
  { month: 'Apr', operations: 260 },
  { month: 'May', operations: 240 },
  { month: 'Jun', operations: 280 },
];

export const BarChartStacked: Story = () => (
  <div className="p-4">
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <BarChart data={trafficData}>
        <XAxis dataKey="time" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
        <Bar dataKey="error" stackId="a" fill="var(--color-error)" />
        <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" />
      </BarChart>
    </ChartContainer>
  </div>
);

BarChartStacked.meta = {
  description: 'Stacked bar chart with three series',
};

export const BarChartSimple: Story = () => (
  <div className="p-4">
    <ChartContainer config={simpleChartConfig} className="h-[250px] w-full">
      <BarChart data={simpleData}>
        <XAxis dataKey="month" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="operations" fill="var(--color-operations)" />
      </BarChart>
    </ChartContainer>
  </div>
);

BarChartSimple.meta = {
  description: 'Simple bar chart with single series',
};

export const LineChartSimple: Story = () => (
  <div className="p-4">
    <ChartContainer config={simpleChartConfig} className="h-[250px] w-full">
      <LineChart data={simpleData}>
        <XAxis dataKey="month" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="operations"
          stroke="var(--color-operations)"
          strokeWidth={2}
        />
      </LineChart>
    </ChartContainer>
  </div>
);

LineChartSimple.meta = {
  description: 'Simple line chart with smooth curve',
};

export const WithLegend: Story = () => (
  <div className="p-4">
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={trafficData}>
        <XAxis dataKey="time" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
        <Bar dataKey="error" stackId="a" fill="var(--color-error)" />
        <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" />
      </BarChart>
    </ChartContainer>
  </div>
);

WithLegend.meta = {
  description: 'Chart with legend below',
};

export const TracesTrafficChart: Story = () => (
  <div className="p-4 max-w-4xl">
    <div className="mb-4">
      <p className="text-neutral-11 text-sm mb-2">
        Usage example from Traces page:
      </p>
      <p className="text-neutral-10 text-xs">
        The stacked bar chart shows trace traffic over time, with successful (ok), failed (error),
        and remaining traces stacked in each bar.
      </p>
    </div>
    <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart data={trafficData}>
          <XAxis dataKey="time" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
          <Bar dataKey="error" stackId="a" fill="var(--color-error)" />
          <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" />
        </BarChart>
      </ChartContainer>
    </div>
  </div>
);

TracesTrafficChart.meta = {
  description: 'Real usage: Traffic chart on Traces page',
};

export const ColorPaletteShowcase: Story = () => (
  <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-6xl">
    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Chart Component</h2>
      <p className="text-neutral-11 mb-4">
        Wrapper components for Recharts library with custom styling and theming. Provides
        ChartContainer, ChartTooltip, ChartLegend, and configuration system for building responsive
        charts. Used in traces, analytics, and usage reporting.
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Basic Bar Chart</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ChartContainer config={simpleChartConfig} className="h-[200px] w-full">
              <BarChart data={simpleData}>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="operations" fill="var(--color-operations)" />
              </BarChart>
            </ChartContainer>
          </div>
          <p className="text-xs text-neutral-10">
            Container: <code className="text-neutral-12">aspect-video flex justify-center</code> by
            default
            <br />
            Responsive: Uses <code className="text-neutral-12">ResponsiveContainer</code> from
            Recharts
            <br />
            Height: Override with className (e.g.,{' '}
            <code className="text-neutral-12">h-[200px]</code>)
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Stacked Bar Chart</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={trafficData}>
                <XAxis dataKey="time" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
                <Bar dataKey="error" stackId="a" fill="var(--color-error)" />
                <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" />
              </BarChart>
            </ChartContainer>
          </div>
          <p className="text-xs text-neutral-10">
            Stacking: Use same <code className="text-neutral-12">stackId</code> on multiple Bar
            components
            <br />
            Colors: Reference config via{' '}
            <code className="text-neutral-12">var(--color-keyname)</code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Line Chart</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ChartContainer config={simpleChartConfig} className="h-[200px] w-full">
              <LineChart data={simpleData}>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="operations"
                  stroke="var(--color-operations)"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </div>
          <p className="text-xs text-neutral-10">
            Type: <code className="text-neutral-12">monotone</code> for smooth curves
            <br />
            Stroke width: <code className="text-neutral-12">strokeWidth={'{2}'}</code> for
            visibility
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Chart with Legend</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={trafficData}>
                <XAxis dataKey="time" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" />
                <Bar dataKey="error" stackId="a" fill="var(--color-error)" />
              </BarChart>
            </ChartContainer>
          </div>
          <p className="text-xs text-neutral-10">
            Legend: <code className="text-neutral-12">ChartLegend + ChartLegendContent</code>
            <br />
            Position: <code className="text-neutral-12">verticalAlign="bottom"</code> (default)
            <br />
            Shows color squares and labels from config
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-neutral-11 text-sm font-medium">Tooltip</p>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <div className="bg-neutral-3 border-border/50 rounded-lg border px-2.5 py-1.5 shadow-xl max-w-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-sm bg-emerald-500" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-neutral-10 text-xs">Successful</span>
                    <span className="text-neutral-11 text-xs font-mono font-medium">450</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-sm bg-red-500" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-neutral-10 text-xs">Failed</span>
                    <span className="text-neutral-11 text-xs font-mono font-medium">25</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-10 mt-3">
              Background: <code className="text-neutral-12">bg-neutral-3</code>
              <br />
              Border: <code className="text-neutral-12">border-border/50</code>
              <br />
              Values: <code className="text-neutral-12">font-mono font-medium tabular-nums</code>
              <br />
              Labels: <code className="text-neutral-12">text-neutral-10</code>
              <br />
              Indicator: <code className="text-neutral-12">size-2.5 rounded-sm</code> (dot, line, or
              dashed)
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">ChartConfig Type</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <pre className="text-xs text-neutral-12 bg-neutral-3 p-3 rounded overflow-x-auto">
          {`type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

// Example:
const chartConfig = {
  ok: {
    label: 'Successful',
    color: 'hsl(var(--chart-1))',
  },
  error: {
    label: 'Failed',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;`}
        </pre>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Components</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ChartContainer</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">config</code>: ChartConfig (required) - Chart
              configuration object
            </li>
            <li>
              <code className="text-neutral-12">children</code>: Recharts chart component (required)
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
              classes
            </li>
            <li>
              <code className="text-neutral-12">id</code>: string (optional) - Unique chart ID
            </li>
          </ul>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ChartTooltipContent</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">hideLabel</code>: boolean (optional) - Hide tooltip
              label
            </li>
            <li>
              <code className="text-neutral-12">hideIndicator</code>: boolean (optional) - Hide
              color indicator
            </li>
            <li>
              <code className="text-neutral-12">indicator</code>: "line" | "dot" | "dashed"
              (optional, default: "dot")
            </li>
            <li>
              <code className="text-neutral-12">nameKey</code>: string (optional) - Key for name in
              payload
            </li>
            <li>
              <code className="text-neutral-12">labelKey</code>: string (optional) - Key for label
              in payload
            </li>
            <li>
              <code className="text-neutral-12">formatter</code>: function (optional) - Custom value
              formatter
            </li>
          </ul>
        </div>

        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">ChartLegendContent</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">hideIcon</code>: boolean (optional) - Hide legend
              icons
            </li>
            <li>
              <code className="text-neutral-12">nameKey</code>: string (optional) - Key for name in
              payload
            </li>
            <li>
              <code className="text-neutral-12">verticalAlign</code>: "top" | "bottom" (optional,
              default: "bottom")
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
              classes
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Color Variables</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10 mb-2">CSS custom properties generated from config:</p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            Config key <code className="text-neutral-12">"ok"</code> → CSS variable{' '}
            <code className="text-neutral-12">--color-ok</code>
          </li>
          <li>
            Usage in chart: <code className="text-neutral-12">fill="var(--color-ok)"</code>
          </li>
          <li>
            Default chart colors:{' '}
            <code className="text-neutral-12">
              --chart-1, --chart-2, --chart-3, --chart-4, --chart-5
            </code>
          </li>
          <li>Reference with HSL: <code className="text-neutral-12">hsl(var(--chart-1))</code></li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Styling Details</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <ul className="text-xs space-y-2 text-neutral-10">
          <li>
            <strong className="text-neutral-12">Axis ticks:</strong>{' '}
            <code className="text-neutral-12">fill-muted-foreground</code>
          </li>
          <li>
            <strong className="text-neutral-12">Grid lines:</strong>{' '}
            <code className="text-neutral-12">stroke-border/50</code>
          </li>
          <li>
            <strong className="text-neutral-12">Tooltip cursor:</strong>{' '}
            <code className="text-neutral-12">stroke-border or fill-muted</code>
          </li>
          <li>
            <strong className="text-neutral-12">Today marker:</strong>{' '}
            <code className="text-neutral-12">bg-accent text-neutral-12</code>
          </li>
          <li>
            <strong className="text-neutral-12">White strokes removed:</strong> Transparent for
            cleaner look
          </li>
          <li>
            <strong className="text-neutral-12">Focus rings:</strong> All interactive elements have
            outline-none
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Pattern</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <pre className="text-xs text-neutral-12 bg-neutral-3 p-3 rounded overflow-x-auto">
          {`// 1. Define chart config
const chartConfig = {
  operations: {
    label: 'Operations',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

// 2. Prepare data
const data = [
  { month: 'Jan', operations: 150 },
  { month: 'Feb', operations: 180 },
  // ...
];

// 3. Render chart
<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <BarChart data={data}>
    <XAxis dataKey="month" />
    <YAxis />
    <CartesianGrid strokeDasharray="3 3" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="operations" fill="var(--color-operations)" />
  </BarChart>
</ChartContainer>`}
        </pre>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Recharts Integration</h2>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <p className="text-xs text-neutral-10 mb-2">
          These components wrap and re-export Recharts components:
        </p>
        <ul className="text-xs space-y-1 text-neutral-10">
          <li>
            <code className="text-neutral-12">ChartTooltip</code> = Recharts.Tooltip
          </li>
          <li>
            <code className="text-neutral-12">ChartLegend</code> = Recharts.Legend
          </li>
          <li>Import chart types directly from recharts: BarChart, LineChart, AreaChart, etc.</li>
          <li>Import chart elements: XAxis, YAxis, CartesianGrid, Bar, Line, Area, etc.</li>
          <li>Use custom content components: ChartTooltipContent, ChartLegendContent</li>
        </ul>
      </div>
    </div>

    <div>
      <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
      <div className="space-y-4">
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Traces Traffic</p>
          <p className="text-neutral-10 text-xs">
            Stacked bar charts showing trace status breakdown over time (successful, failed,
            remaining)
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Usage Analytics</p>
          <p className="text-neutral-10 text-xs">
            Line charts showing operation usage trends, request counts, and performance metrics
          </p>
        </div>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm font-medium mb-2">Schema Changes</p>
          <p className="text-neutral-10 text-xs">
            Bar charts visualizing schema change frequency and types over time periods
          </p>
        </div>
      </div>
    </div>
  </div>
);
