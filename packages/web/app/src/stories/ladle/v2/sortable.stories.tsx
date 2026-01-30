import { useState } from 'react';
import { Sortable } from '@/components/v2/sortable';
import type { Story } from '@ladle/react';
import { SortDirection } from '@tanstack/react-table';

export default {
  title: 'V2 / Sortable',
};

export const NotSorted: Story = () => <Sortable sortOrder={false}>Column Name</Sortable>;

export const Ascending: Story = () => <Sortable sortOrder="asc">Column Name</Sortable>;

export const Descending: Story = () => <Sortable sortOrder="desc">Column Name</Sortable>;

export const Interactive: Story = () => {
  const [sortOrder, setSortOrder] = useState<SortDirection | false>(false);

  const handleClick = () => {
    if (sortOrder === false) setSortOrder('desc');
    else if (sortOrder === 'desc') setSortOrder('asc');
    else setSortOrder(false);
  };

  return (
    <div className="space-y-4">
      <Sortable sortOrder={sortOrder} onClick={handleClick}>
        Click to Sort
      </Sortable>
      <div className="text-neutral-11 text-xs">
        Current sort: {sortOrder === false ? 'none' : sortOrder}
      </div>
    </div>
  );
};

export const InTableHeader: Story = () => {
  const [sortOrder, setSortOrder] = useState<SortDirection | false>(false);

  return (
    <table className="w-full">
      <thead>
        <tr className="border-neutral-6 border-b">
          <th className="px-4 py-3 text-left">
            <Sortable
              sortOrder={sortOrder}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              Name
            </Sortable>
          </th>
          <th className="px-4 py-3 text-left">Email</th>
          <th className="px-4 py-3 text-left">Role</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-neutral-6 border-b">
          <td className="px-4 py-2">John Doe</td>
          <td className="px-4 py-2">john@example.com</td>
          <td className="px-4 py-2">Admin</td>
        </tr>
        <tr className="border-neutral-6 border-b">
          <td className="px-4 py-2">Jane Smith</td>
          <td className="px-4 py-2">jane@example.com</td>
          <td className="px-4 py-2">User</td>
        </tr>
      </tbody>
    </table>
  );
};

export const ColorPaletteShowcase: Story = () => (
  <div className="bg-neutral-2 space-y-8 p-8">
    <div>
      <h3 className="text-neutral-12 mb-4 text-lg font-semibold">V2 Sortable Component</h3>
      <p className="text-neutral-11 mb-6 text-sm">
        Sortable table header component with tooltip and triangle icon indicators. Integrates with
        TanStack Table for sorting functionality.
      </p>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Icon Colors</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sortable sortOrder="asc">Sorted</Sortable>
          <code className="text-xs">text-neutral-2</code>
          <span className="text-neutral-11 text-xs">- Triangle icon when sorted</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Icon Rotation</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sortable sortOrder="asc">Ascending</Sortable>
          <code className="text-xs">TriangleUpIcon</code>
          <span className="text-neutral-11 text-xs">- Upward triangle (asc)</span>
        </div>
        <div className="flex items-center gap-3">
          <Sortable sortOrder="desc">Descending</Sortable>
          <code className="text-xs">rotate-180</code>
          <span className="text-neutral-11 text-xs">- Rotated triangle (desc)</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Sort States</h4>
      <div className="space-y-3">
        <div>
          <p className="text-neutral-11 mb-2 text-sm">No sorting (false):</p>
          <Sortable sortOrder={false}>Not Sorted</Sortable>
          <p className="text-neutral-10 mt-1 text-xs">No icon shown</p>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Ascending:</p>
          <Sortable sortOrder="asc">Ascending</Sortable>
          <p className="text-neutral-10 mt-1 text-xs">Triangle pointing up</p>
        </div>
        <div>
          <p className="text-neutral-11 mb-2 text-sm">Descending:</p>
          <Sortable sortOrder="desc">Descending</Sortable>
          <p className="text-neutral-10 mt-1 text-xs">Triangle pointing down</p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Tooltip Text</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Dynamic tooltip based on state:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>Not sorted: "Click to sort descending"</li>
            <li>Descending: "Click to sort ascending"</li>
            <li>Ascending: "Click to cancel sorting"</li>
            <li>Multi-column hint when otherColumnSorted is true</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Layout Classes</h4>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <code className="text-xs">inline-flex items-center justify-center</code>
          <span className="text-neutral-11 text-xs">- Button layout</span>
        </div>
        <div className="flex items-center gap-3">
          <code className="text-xs">ml-2</code>
          <span className="text-neutral-11 text-xs">- Icon spacing from text</span>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Event Handling</h4>
      <div className="space-y-2">
        <div>
          <p className="text-neutral-11 mb-2 text-xs">Click behavior:</p>
          <ul className="text-neutral-10 ml-4 list-inside list-disc space-y-1 text-xs">
            <li>e.stopPropagation() prevents event bubbling</li>
            <li>onClick callback passed through from props</li>
            <li>Typically cycles through: false → desc → asc → false</li>
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="text-neutral-12 mb-3 font-medium">Implementation Notes</h4>
      <ul className="text-neutral-11 list-inside list-disc space-y-1 text-sm">
        <li>Uses TooltipProvider with 100ms delay</li>
        <li>TriangleUpIcon from Radix Icons</li>
        <li>Integrates with TanStack Table SortDirection type</li>
        <li>otherColumnSorted prop adds multi-column sort hint to tooltip</li>
        <li>Tooltip wraps button with asChild pattern</li>
        <li>Icon only shown when sortOrder is not false</li>
        <li>Rotation applied via rotate-180 class for descending</li>
      </ul>
    </div>
  </div>
);
