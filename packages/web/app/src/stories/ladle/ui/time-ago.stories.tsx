import type { Story } from '@ladle/react';
import { TimeAgo } from '@/components/ui/time-ago';

export const Default: Story = () => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  return (
    <div className="space-y-2">
      <p className="text-neutral-11 text-sm">
        Last updated <TimeAgo date={fiveMinutesAgo} />
      </p>
    </div>
  );
};

export const DifferentTimes: Story = () => {
  const now = new Date();

  const times = [
    { label: '30 seconds ago', date: new Date(now.getTime() - 30 * 1000) },
    { label: '5 minutes ago', date: new Date(now.getTime() - 5 * 60 * 1000) },
    { label: '2 hours ago', date: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    { label: '1 day ago', date: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    { label: '1 week ago', date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { label: '1 month ago', date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
  ];

  return (
    <div className="space-y-3 max-w-md">
      {times.map((time, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-neutral-10 text-sm">{time.label}:</span>
          <TimeAgo date={time.date.toISOString()} />
        </div>
      ))}
    </div>
  );
};

export const InTable: Story = () => {
  const now = new Date();

  const items = [
    {
      name: 'Schema v1.2.3',
      date: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
    },
    {
      name: 'Schema v1.2.2',
      date: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: 'Schema v1.2.1',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <div className="max-w-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 text-neutral-10 font-medium">Version</th>
            <th className="text-right p-2 text-neutral-10 font-medium">Published</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="p-2 text-neutral-11">{item.name}</td>
              <td className="p-2 text-right text-neutral-11">
                <TimeAgo date={item.date} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const InSentence: Story = () => {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  return (
    <div className="max-w-md space-y-4">
      <p className="text-neutral-11 text-sm">
        Alice Johnson pushed a new schema <TimeAgo date={twoHoursAgo} />
      </p>
      <p className="text-neutral-11 text-sm">
        Last deployment was <TimeAgo date={twoHoursAgo} />
      </p>
      <p className="text-neutral-11 text-sm">
        Token created <TimeAgo date={twoHoursAgo} />
      </p>
    </div>
  );
};

export const ColorPaletteShowcase: Story = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  return (
    <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-4xl">
      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">TimeAgo Component</h2>
        <p className="text-neutral-11 mb-4">
          Displays relative time (e.g., "2 hours ago") using the @n1ru4l/react-time-ago library.
          Automatically updates as time passes.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Basic Usage</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <p className="text-neutral-11 text-sm">
                Last seen: <TimeAgo date={oneHourAgo} />
              </p>
            </div>
            <p className="text-xs text-neutral-10">
              Cursor: <code className="text-neutral-12">cursor-default</code>
              <br />
              Whitespace: <code className="text-neutral-12">whitespace-nowrap</code>
              <br />
              Title attribute shows full date on hover
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Auto-updating</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <p className="text-neutral-11 text-sm">
                The time display automatically updates. Refresh the page to see the current time
                relative to now: <TimeAgo date={oneHourAgo} />
              </p>
            </div>
            <p className="text-xs text-neutral-10">Component re-renders periodically to stay current</p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">With Custom Styling</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <p className="text-neutral-11 text-sm">
                Custom color: <TimeAgo date={oneHourAgo} className="text-accent font-medium" />
              </p>
            </div>
            <p className="text-xs text-neutral-10">
              Use <code className="text-neutral-12">className</code> prop for custom styles
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <ul className="text-sm space-y-1 text-neutral-11">
            <li>
              <code className="text-neutral-12">date</code>: ISO 8601 date string (optional)
            </li>
            <li>
              <code className="text-neutral-12">className</code>: Additional CSS classes (optional)
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Format Examples</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>Recent: "30 seconds ago", "5 minutes ago", "2 hours ago"</li>
            <li>Days: "1 day ago", "3 days ago"</li>
            <li>Weeks: "1 week ago", "2 weeks ago"</li>
            <li>Months: "1 month ago", "3 months ago"</li>
            <li>Years: "1 year ago", "2 years ago"</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Common Use Cases</h2>
        <div className="space-y-4">
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Activity Feeds</p>
            <p className="text-neutral-10 text-xs">
              Show when schema changes, deployments, or other events occurred.
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Tables</p>
            <p className="text-neutral-10 text-xs">
              Display creation or modification times in token tables, version lists, etc.
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Last Seen/Updated</p>
            <p className="text-neutral-10 text-xs">
              Show when users, operations, or services were last active or updated.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Implementation Details</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm mb-2">Uses @n1ru4l/react-time-ago library</p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>Formats dates with date-fns</li>
            <li>Renders semantic &lt;time&gt; element with dateTime attribute</li>
            <li>Title attribute shows full date for accessibility</li>
            <li>Returns null if date prop is missing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
