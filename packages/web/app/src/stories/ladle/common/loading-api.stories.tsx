import type { Story } from '@ladle/react';

export default {
  title: 'Common / Loading API',
};

export const Documentation: Story = () => (
  <div className="bg-neutral-2 max-w-4xl space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">Common Loading API Indicator</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Global loading indicator that appears at the top of the page when GraphQL requests are in flight.
        Uses custom urql exchange to track inflight requests.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Key Dependencies</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>useInflightRequests hook - Custom urql exchange for tracking requests</li>
        <li>memo - React optimization</li>
      </ul>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Behavior</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Shows/hides based on request count:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>inflightRequests &gt; 0 → Shows indicator</li>
            <li>inflightRequests === 0 → Hides (returns null)</li>
            <li>Automatically tracks all urql queries/mutations</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Visual Styling</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Classes:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>hive-loading-indicator - Custom class for animation (CSS)</li>
            <li>fixed - Fixed positioning</li>
            <li>h-1.5 - Height 6px (0.375rem)</li>
            <li>w-1/2 - Width 50% of viewport</li>
            <li>will-change-transform - Optimization hint for animation</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Custom urql Exchange</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">
            useInflightRequests hook from @/lib/urql-exchanges/state:
          </p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Tracks active GraphQL requests</li>
            <li>Increments count when request starts</li>
            <li>Decrements count when request completes/errors</li>
            <li>Returns current count as number</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">CSS Animation</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-10 text-xs">
            The .hive-loading-indicator class likely defines:
          </p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Top positioning (top: 0)</li>
            <li>Background color (orange/accent)</li>
            <li>Animation (sliding or pulsing effect)</li>
            <li>z-index for visibility above content</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Usage Pattern</h4>
      <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
        {`import { LoadingAPIIndicator } from '@/components/common/LoadingAPI';

// In root layout or _app
function Layout() {
  return (
    <div>
      <LoadingAPIIndicator />
      {/* Rest of app */}
    </div>
  );
}`}
      </pre>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Wrapped in React.memo for performance</li>
        <li>Returns null when no requests (no DOM element)</li>
        <li>Fixed positioning ensures always visible</li>
        <li>Half-width creates centered appearance</li>
        <li>will-change-transform optimizes animation performance</li>
        <li>Automatically reacts to all GraphQL operations</li>
      </ul>
    </div>
  </div>
);
