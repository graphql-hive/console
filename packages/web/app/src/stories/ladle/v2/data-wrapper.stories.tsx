import type { Story } from '@ladle/react';

export default {
  title: 'V2 / Data Wrapper',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Data Wrapper Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Higher-order component that wraps urql query results and handles loading, error, and
        success states. Provides clean render prop pattern for data access.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Purpose</h4>
      <p className="text-neutral-11 text-sm">
        Eliminates repetitive loading/error handling code by centralizing query state management.
        Renders children only when data is available.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Props</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`interface Props<TData, TVariables> {
  query: UseQueryState<TData, TVariables>;  // urql query result
  showStale?: boolean;                      // Show stale data while refetching
  organizationSlug: string | null;          // For QueryError component
  children(props: { data: TData }): ReactNode;  // Render prop with data
  spinnerComponent?: ReactNode;             // Custom loading indicator
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">State Handling</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Render logic:</p>
          <ol className="text-neutral-10 ml-4 list-inside list-decimal space-y-1 text-xs">
            <li>If query.fetching → Show spinnerComponent</li>
            <li>If query.error → Show QueryError component</li>
            <li>If !query.data → Show spinnerComponent</li>
            <li>Otherwise → Call children render prop with data</li>
          </ol>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>urql - GraphQL client library</li>
        <li>QueryError component - Error display with retry</li>
        <li>React Component class (not functional component)</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { useQuery } from 'urql';
import { DataWrapper } from '@/components/v2/data-wrapper';

function MyComponent() {
  const [query] = useQuery({ query: MY_QUERY });

  return (
    <DataWrapper
      query={query}
      organizationSlug={orgSlug}
      spinnerComponent={<Spinner />}
    >
      {({ data }) => (
        <div>
          {/* Render with data - guaranteed to be defined */}
          <h1>{data.title}</h1>
        </div>
      )}
    </DataWrapper>
  );
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Benefits</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Eliminates null checks - data is guaranteed when children render</li>
        <li>Centralized error handling via QueryError</li>
        <li>Consistent loading states across application</li>
        <li>Type-safe data access via generics</li>
        <li>Render prop pattern for flexibility</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Class component (not hooks-based)</li>
        <li>Generic types &lt;TData, TVariables&gt; for type safety</li>
        <li>showStale prop available but not currently used in render</li>
        <li>organizationSlug passed to QueryError for context</li>
        <li>Spinner shown for both initial load and !data states</li>
        <li>QueryError includes retry functionality</li>
      </ul>
    </div>
  </div>
);
