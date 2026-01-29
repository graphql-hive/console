import type { Story } from '@ladle/react';

export default {
  title: 'Domain / Target / Insights and History',
};

export const Overview: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">
        Target Insights and History Components
      </h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Operation insights components for analyzing GraphQL query usage and performance, plus
        schema history components for tracking changes over time.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Insights Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Filters.tsx - Filter operations by client, hash, name</li>
        <li>List.tsx - Table of operations with usage stats</li>
        <li>Stats.tsx - Summary statistics cards</li>
        <li>Fallback.tsx - Empty state when no data</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">History Components</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>errors-and-changes.tsx - Schema version history with errors</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Insights Filters</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Filter options:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Date range picker - Time period for data</li>
          <li>Client name filter - Filter by GraphQL client</li>
          <li>Operation hash filter - Specific operation hash</li>
          <li>Operation name filter - Search by operation name</li>
          <li>Sort by - Request count, latency, errors</li>
          <li>Order - Ascending/descending</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Insights List (Operations Table)</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`Columns:
- Operation Name (clickable to view details)
- Client Name
- Request Count (total executions)
- p95 Latency (95th percentile response time)
- p99 Latency (99th percentile response time)
- Error Rate (%)
- Last Seen (timestamp)`}
      </pre>
      <div className="mt-3 space-y-2">
        <p className="text-neutral-11 text-xs">Features:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Sortable columns</li>
          <li>Pagination for large datasets</li>
          <li>Click row to view operation details</li>
          <li>Color-coded error rates (green, yellow, red)</li>
          <li>Sparkline charts for trends</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Insights Stats (Summary Cards)</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Summary metrics:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Total Requests - Total operation executions</li>
          <li>Unique Operations - Number of distinct operations</li>
          <li>Average Latency - Mean response time</li>
          <li>Error Rate - Overall error percentage</li>
          <li>Top Clients - Most active clients list</li>
          <li>Slowest Operations - Operations with highest latency</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Insights Fallback (Empty State)</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Shown when:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>No operations tracked yet</li>
          <li>Date range has no data</li>
          <li>Filters match no operations</li>
          <li>Displays instructions to start tracking</li>
          <li>Link to usage tracking docs</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Operation Detail View</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Clicking an operation shows:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Full GraphQL operation body</li>
          <li>Syntax highlighting</li>
          <li>Request count timeline chart</li>
          <li>Latency distribution chart</li>
          <li>Error timeline chart</li>
          <li>Client breakdown</li>
          <li>Recent error messages</li>
          <li>Field-level execution stats</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Errors and Changes (History)</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Timeline of schema versions:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Schema version ID and commit</li>
          <li>Published timestamp</li>
          <li>Author who published</li>
          <li>Validation status (valid/invalid)</li>
          <li>Error messages if validation failed</li>
          <li>List of changes from previous version</li>
          <li>Breaking changes highlighted</li>
          <li>Click version to view full schema</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Schema Version Changes Display</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For each version:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Added types (green badge)</li>
          <li>Removed types (red badge)</li>
          <li>Modified types (yellow badge)</li>
          <li>Added fields count</li>
          <li>Removed fields count</li>
          <li>Deprecations added</li>
          <li>Breaking change warnings</li>
          <li>Expandable diff viewer</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Validation Errors Display</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">For invalid schemas:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Error message</li>
          <li>Error type (syntax, composition, etc.)</li>
          <li>Line/column if applicable</li>
          <li>Affected service (for federation)</li>
          <li>Suggested fix hints</li>
          <li>Red warning banner</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">GraphQL Queries</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>OperationsStats - Summary metrics for date range</li>
        <li>OperationsList - Paginated operations with stats</li>
        <li>OperationDetail - Full details for single operation</li>
        <li>SchemaVersionHistory - Timeline of schema versions</li>
        <li>SchemaVersionChanges - Diff between versions</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Performance Metrics</h4>
      <div className="space-y-2">
        <p className="text-neutral-11 text-xs">Collected per operation:</p>
        <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
          <li>Request count - Total executions</li>
          <li>p50, p75, p95, p99 latency - Percentiles</li>
          <li>Error count and rate</li>
          <li>Client distribution</li>
          <li>Field-level execution time</li>
          <li>Resolver performance</li>
        </ul>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Charts and Visualizations</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Request timeline - Line chart of request volume</li>
        <li>Latency distribution - Histogram of response times</li>
        <li>Error rate timeline - Line chart of error percentage</li>
        <li>Client pie chart - Requests by client</li>
        <li>Sparklines - Inline trends in table</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL queries for operation data</li>
        <li>Chart library - Visualization components</li>
        <li>Date picker - Date range filtering</li>
        <li>Table component - Operation list</li>
        <li>Diff viewer - Schema change comparison</li>
        <li>GraphQL syntax highlighter - Operation display</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Insights powered by operation tracking/reporting</li>
        <li>Real-time data with configurable refresh</li>
        <li>Percentile latencies for accurate performance view</li>
        <li>Client identification for usage attribution</li>
        <li>Field-level stats for resolver optimization</li>
        <li>History shows complete schema evolution</li>
        <li>Validation errors prevent breaking deployments</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Note</h4>
      <p className="text-neutral-10 text-sm">
        This is a documentation-only story. These components display operation analytics and schema
        history using GraphQL queries and chart libraries. See actual usage in target insights and
        history pages.
      </p>
    </div>
  </div>
);
